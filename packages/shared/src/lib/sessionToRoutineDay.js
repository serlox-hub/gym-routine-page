/**
 * Turning a past session (History) into a new routine day.
 *
 * The rows are built here and `create_routine_day_with_exercises` (migration 067) only validates and
 * inserts them: the repo has no SQL tests, so every rule that can go wrong lives in this file.
 */

// Tokens `create_routine_day_with_exercises` raises (migration 067). They are the contract with the
// database: the error is recognised by the token that starts its message.
export const ROUTINE_DAY_ERROR_TOKENS = {
  INVALID_ARGUMENTS: 'invalid_arguments',
  UNKNOWN_FIELD: 'unknown_field',
  NOTHING_TO_COPY: 'nothing_to_copy',
  ROUTINE_NOT_FOUND: 'routine_not_found',
  EXERCISE_NOT_AVAILABLE: 'exercise_not_available',
}

const ROUTINE_DAY_ERROR_KEYS = {
  [ROUTINE_DAY_ERROR_TOKENS.INVALID_ARGUMENTS]: 'workout:history.convertToDay.errors.invalidArguments',
  [ROUTINE_DAY_ERROR_TOKENS.UNKNOWN_FIELD]: 'workout:history.convertToDay.errors.unknownField',
  [ROUTINE_DAY_ERROR_TOKENS.NOTHING_TO_COPY]: 'workout:history.convertToDay.errors.nothingToCopy',
  [ROUTINE_DAY_ERROR_TOKENS.ROUTINE_NOT_FOUND]: 'workout:history.convertToDay.errors.routineNotFound',
  [ROUTINE_DAY_ERROR_TOKENS.EXERCISE_NOT_AVAILABLE]: 'workout:history.convertToDay.errors.exerciseNotAvailable',
}

const ROUTINE_DAY_GENERIC_ERROR_KEY = 'workout:history.convertToDay.errors.generic'

export const CONVERT_BLOCKED_REASON = {
  NO_ROUTINE: 'noRoutine',
  NO_ROUTINE_NAME: 'noRoutineName',
  NO_DAY_NAME: 'noDayName',
}

export const CONVERT_BLOCKED_MESSAGE_KEYS = {
  [CONVERT_BLOCKED_REASON.NO_ROUTINE]: 'workout:history.convertToDay.blocked.noRoutine',
  [CONVERT_BLOCKED_REASON.NO_ROUTINE_NAME]: 'workout:history.convertToDay.blocked.noRoutineName',
  [CONVERT_BLOCKED_REASON.NO_DAY_NAME]: 'workout:history.convertToDay.blocked.noDayName',
}

function toRoutineRow(row, series, supersetGroup) {
  return {
    exercise_id: row.exercise.id,
    series,
    reps: row.reps,
    target_field: row.target_field ?? null,
    level: row.level ?? null,
    rir: row.rir ?? null,
    rest_seconds: row.rest_seconds ?? null,
    notes: row.notes ?? null,
    superset_group: supersetGroup,
    is_warmup: row.is_warmup || false,
  }
}

/**
 * Rows of the new routine day, from the History detail of a session.
 *
 * - A row whose exercise is missing or soft-deleted is skipped (`skipped.deleted`), as "Repeat
 *   workout" does.
 * - `series` is the number of sets done, whatever their `set_type`: a dropset is a set that was
 *   done. The planned `series` is not used (it never changes mid-session). A row with no sets left
 *   is skipped (`skipped.empty`).
 * - A superset left with fewer than two members becomes standalone, as migration 065 does. A
 *   superset is a run of consecutive rows, so each one is gathered at the position of its first
 *   member, in that member's block, even if the session had it split or across both blocks.
 * - Warm-up units first, then main ones, each in session order; `sort_order` is 1..n.
 *
 * @param {Array} sessionExercises - `session.exercises` as produced by `transformSessionDetailData`
 * @returns {{ exercises: Array<object>, skipped: { deleted: number, empty: number } }}
 */
export function buildRoutineDayFromSession(sessionExercises) {
  const skipped = { deleted: 0, empty: 0 }
  const kept = []

  for (const row of sessionExercises || []) {
    if (!row?.exercise || row.exercise.deleted_at) {
      skipped.deleted += 1
      continue
    }
    const series = row.sets?.length ?? 0
    if (series === 0) {
      skipped.empty += 1
      continue
    }
    kept.push({ row, series })
  }

  // Counted on the rows that survive: a partner skipped above no longer makes a superset.
  const groupSizes = new Map()
  for (const { row } of kept) {
    if (row.superset_group == null) continue
    groupSizes.set(row.superset_group, (groupSizes.get(row.superset_group) ?? 0) + 1)
  }

  const units = []
  const unitByGroup = new Map()
  for (const { row, series } of kept) {
    const group = groupSizes.get(row.superset_group) >= 2 ? row.superset_group : null
    const routineRow = toRoutineRow(row, series, group)
    const existing = group == null ? null : unitByGroup.get(group)
    if (existing) {
      existing.rows.push(routineRow)
      continue
    }
    const unit = { isWarmup: routineRow.is_warmup, rows: [routineRow] }
    if (group != null) unitByGroup.set(group, unit)
    units.push(unit)
  }

  const ordered = [...units.filter(unit => unit.isWarmup), ...units.filter(unit => !unit.isWarmup)]
  const exercises = ordered
    .flatMap(unit => unit.rows.map(row => ({ ...row, is_warmup: unit.isWarmup })))
    .map((row, index) => ({ ...row, sort_order: index + 1 }))

  return { exercises, skipped }
}

/**
 * Default name of the new day: the same fallback as the History header.
 * @param {object} session - History detail of the session
 * @param {function} t - i18n translate function
 * @returns {string}
 */
export function getSessionDayNameDefault(session, t) {
  return session?.day_name || session?.routine_day?.name || t('workout:session.freeWorkout')
}

/**
 * Routine preselected in the dialog: the session's source routine, if the user still has it.
 * A session whose day was deleted has lost it (`routine_day_id` is `ON DELETE SET NULL`).
 * @param {object} session - History detail of the session
 * @param {Array<{ id: number|string }>|null} routines - The user's routines
 * @returns {string|null} The routine id as a string, or null
 */
export function getDefaultRoutineIdForSession(session, routines) {
  const routineId = session?.routine_day?.routine?.id
  if (routineId == null) return null
  return (routines || []).some(routine => String(routine.id) === String(routineId))
    ? String(routineId)
    : null
}

/**
 * Whether the dialog's Confirm can go, and why not. While the request is in flight Confirm is
 * really disabled (transient state), so there is no reason to explain.
 * @param {object} params
 * @param {{ kind: 'new' } | { kind: 'existing', routineId: string|number } | null} params.selection
 * @param {string} params.newRoutineName
 * @param {string} params.dayName
 * @param {boolean} [params.isPending]
 * @returns {{ canConfirm: boolean, blockedReason: 'noRoutine'|'noRoutineName'|'noDayName'|null }}
 */
export function getConvertToRoutineDayState({ selection, newRoutineName, dayName, isPending = false }) {
  if (isPending) return { canConfirm: false, blockedReason: null }

  const blocked = (blockedReason) => ({ canConfirm: false, blockedReason })
  const hasRoutine = selection?.kind === 'new' || (selection?.kind === 'existing' && selection.routineId != null)
  if (!hasRoutine) return blocked(CONVERT_BLOCKED_REASON.NO_ROUTINE)
  if (selection.kind === 'new' && !newRoutineName?.trim()) return blocked(CONVERT_BLOCKED_REASON.NO_ROUTINE_NAME)
  if (!dayName?.trim()) return blocked(CONVERT_BLOCKED_REASON.NO_DAY_NAME)
  return { canConfirm: true, blockedReason: null }
}

/**
 * Which token `create_routine_day_with_exercises` raised, or null for any other failure.
 * @param {{ message?: string }|null} error - supabase-js error
 * @returns {string|null}
 */
export function getRoutineDayErrorToken(error) {
  const message = error?.message
  if (!message) return null
  return Object.values(ROUTINE_DAY_ERROR_TOKENS).find(token => message.startsWith(token)) ?? null
}

/**
 * i18n key of the message for a failed `create_routine_day_with_exercises` call.
 * @param {{ message?: string }|null} error - supabase-js error
 * @returns {string}
 */
export function getRoutineDayErrorKey(error) {
  return ROUTINE_DAY_ERROR_KEYS[getRoutineDayErrorToken(error)] ?? ROUTINE_DAY_GENERIC_ERROR_KEY
}

/**
 * Success toast: one line saying it worked, plus one per reason something was left out. One
 * toast, not several: a new toast replaces the one on screen in both apps.
 * @param {{ deleted: number, empty: number }} skipped
 * @param {function} t - i18n translate function
 * @returns {string}
 */
export function getConvertToRoutineDaySuccessMessage(skipped, t) {
  const lines = [t('workout:history.convertToDay.success')]
  if (skipped?.deleted > 0) lines.push(t('workout:history.convertToDay.skippedDeleted', { count: skipped.deleted }))
  if (skipped?.empty > 0) lines.push(t('workout:history.convertToDay.skippedEmpty', { count: skipped.empty }))
  return lines.join('\n')
}
