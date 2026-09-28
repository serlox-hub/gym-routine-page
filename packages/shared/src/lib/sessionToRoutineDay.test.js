import { describe, it, expect } from 'vitest'
import { t } from '../i18n/index.js'
import {
  buildRoutineDayFromSession,
  getSessionDayNameDefault,
  getDefaultRoutineIdForSession,
  getConvertToRoutineDayState,
  getRoutineDayErrorToken,
  getRoutineDayErrorKey,
  getConvertToRoutineDaySuccessMessage,
  ROUTINE_DAY_ERROR_TOKENS,
  CONVERT_BLOCKED_REASON,
} from './sessionToRoutineDay.js'

// A row of `session.exercises` as `transformSessionDetailData` builds it.
function sessionRow(exerciseId, { sets = 3, supersetGroup = null, isWarmup = false, deleted = false, ...fields } = {}) {
  return {
    sessionExerciseId: exerciseId * 100,
    exercise: { id: exerciseId, name: `Exercise ${exerciseId}`, deleted_at: deleted ? '2026-01-01T00:00:00Z' : null },
    series: 3,
    target_field: 'reps',
    reps: '8-12',
    level: null,
    rir: 2,
    rest_seconds: 90,
    notes: null,
    superset_group: supersetGroup,
    is_extra: false,
    is_warmup: isWarmup,
    sets: Array.from({ length: sets }, (_, index) => ({ id: exerciseId * 1000 + index, set_number: index + 1, set_type: 'normal' })),
    ...fields,
  }
}

const idsAndOrder = (exercises) => exercises.map(row => [row.exercise_id, row.sort_order, row.superset_group, row.is_warmup])

describe('buildRoutineDayFromSession', () => {
  it('puts warm-up first, keeps a superset contiguous and numbers sort_order 1..n', () => {
    const session = [
      sessionRow(1, { supersetGroup: 1 }),
      sessionRow(2, { supersetGroup: 1 }),
      sessionRow(3, { isWarmup: true }),
      sessionRow(4),
    ]

    const { exercises, skipped } = buildRoutineDayFromSession(session)

    expect(idsAndOrder(exercises)).toEqual([
      [3, 1, null, true],
      [1, 2, 1, false],
      [2, 3, 1, false],
      [4, 4, null, false],
    ])
    expect(skipped).toEqual({ deleted: 0, empty: 0 })
  })

  it('counts every set done as a series, the dropset included, not the planned series', () => {
    const row = sessionRow(1, { sets: 5, series: 3 })
    row.sets[4].set_type = 'dropset'

    const { exercises } = buildRoutineDayFromSession([row])

    expect(exercises[0].series).toBe(5)
  })

  it('skips a soft-deleted exercise and one with no sets, and counts each', () => {
    const session = [
      sessionRow(1, { deleted: true }),
      sessionRow(2, { sets: 0 }),
      sessionRow(3),
    ]

    const { exercises, skipped } = buildRoutineDayFromSession(session)

    expect(exercises.map(row => row.exercise_id)).toEqual([3])
    expect(skipped).toEqual({ deleted: 1, empty: 1 })
  })

  it('counts a row with no exercise (not visible any more) as deleted', () => {
    const { exercises, skipped } = buildRoutineDayFromSession([{ ...sessionRow(1), exercise: null }])

    expect(exercises).toEqual([])
    expect(skipped).toEqual({ deleted: 1, empty: 0 })
  })

  it('counts a deleted exercise with no sets once, as deleted', () => {
    const { skipped } = buildRoutineDayFromSession([sessionRow(1, { deleted: true, sets: 0 })])

    expect(skipped).toEqual({ deleted: 1, empty: 0 })
  })

  it('leaves the survivor standalone when its superset partner is skipped', () => {
    const session = [
      sessionRow(1, { supersetGroup: 4 }),
      sessionRow(2, { supersetGroup: 4, deleted: true }),
    ]

    const { exercises } = buildRoutineDayFromSession(session)

    expect(exercises).toHaveLength(1)
    expect(exercises[0].superset_group).toBeNull()
  })

  it('gathers non-contiguous members of a group at the position of its first member', () => {
    const session = [
      sessionRow(1, { supersetGroup: 2 }),
      sessionRow(2),
      sessionRow(3, { supersetGroup: 2 }),
      sessionRow(4),
    ]

    const { exercises } = buildRoutineDayFromSession(session)

    expect(idsAndOrder(exercises)).toEqual([
      [1, 1, 2, false],
      [3, 2, 2, false],
      [2, 3, null, false],
      [4, 4, null, false],
    ])
  })

  it('moves a group spanning warm-up and main entirely to the block of its first member', () => {
    const session = [
      sessionRow(1, { isWarmup: true }),
      sessionRow(2, { isWarmup: true, supersetGroup: 1 }),
      sessionRow(3, { supersetGroup: 1 }),
      sessionRow(4),
      sessionRow(5, { supersetGroup: 7 }),
      sessionRow(6, { isWarmup: true, supersetGroup: 7 }),
    ]

    const { exercises } = buildRoutineDayFromSession(session)

    expect(idsAndOrder(exercises)).toEqual([
      [1, 1, null, true],
      [2, 2, 1, true],
      [3, 3, 1, true],
      [4, 4, null, false],
      [5, 5, 7, false],
      [6, 6, 7, false],
    ])
  })

  it('copies the prescription fields as they are and nothing else', () => {
    const row = sessionRow(9, {
      target_field: null,
      reps: '20min',
      level: 6,
      rir: null,
      rest_seconds: null,
      notes: 'Slow',
      is_extra: true,
      routine_exercise_id: 55,
    })

    const { exercises } = buildRoutineDayFromSession([row])

    expect(exercises[0]).toEqual({
      exercise_id: 9,
      sort_order: 1,
      series: 3,
      reps: '20min',
      target_field: null,
      level: 6,
      rir: null,
      rest_seconds: null,
      notes: 'Slow',
      superset_group: null,
      is_warmup: false,
    })
  })

  it('returns nothing to copy for an empty or missing list', () => {
    expect(buildRoutineDayFromSession([])).toEqual({ exercises: [], skipped: { deleted: 0, empty: 0 } })
    expect(buildRoutineDayFromSession(null)).toEqual({ exercises: [], skipped: { deleted: 0, empty: 0 } })
  })
})

describe('getSessionDayNameDefault', () => {
  it('uses the session day name', () => {
    expect(getSessionDayNameDefault({ day_name: 'Push', routine_day: { name: 'Pull' } }, t)).toBe('Push')
  })

  it('falls back to the routine day name when day_name is empty, like the History header', () => {
    expect(getSessionDayNameDefault({ day_name: '', routine_day: { name: 'Pull' } }, t)).toBe('Pull')
  })

  it('falls back to the free workout label', () => {
    expect(getSessionDayNameDefault({ day_name: '', routine_day: null }, t)).toBe(t('workout:session.freeWorkout'))
  })
})

describe('getDefaultRoutineIdForSession', () => {
  const routines = [{ id: 3 }, { id: 8 }]

  it('returns the source routine id as a string when the user still has it', () => {
    expect(getDefaultRoutineIdForSession({ routine_day: { routine: { id: 8 } } }, routines)).toBe('8')
  })

  it('returns null when the routine is not in the list', () => {
    expect(getDefaultRoutineIdForSession({ routine_day: { routine: { id: 5 } } }, routines)).toBeNull()
  })

  it('returns null for a free session or one whose day was deleted', () => {
    expect(getDefaultRoutineIdForSession({ routine_day: null }, routines)).toBeNull()
  })

  it('returns null while the routines are not loaded', () => {
    expect(getDefaultRoutineIdForSession({ routine_day: { routine: { id: 8 } } }, null)).toBeNull()
  })
})

describe('getConvertToRoutineDayState', () => {
  const ready = { selection: { kind: 'existing', routineId: '3' }, newRoutineName: '', dayName: 'Push' }

  it('can confirm with an existing routine and a day name', () => {
    expect(getConvertToRoutineDayState(ready)).toEqual({ canConfirm: true, blockedReason: null })
  })

  it('can confirm with a new routine that has a name', () => {
    expect(getConvertToRoutineDayState({ ...ready, selection: { kind: 'new' }, newRoutineName: 'Summer' }))
      .toEqual({ canConfirm: true, blockedReason: null })
  })

  it('is blocked with no routine selected', () => {
    expect(getConvertToRoutineDayState({ ...ready, selection: null }))
      .toEqual({ canConfirm: false, blockedReason: CONVERT_BLOCKED_REASON.NO_ROUTINE })
  })

  it('is blocked with a new routine whose name is blank', () => {
    expect(getConvertToRoutineDayState({ ...ready, selection: { kind: 'new' }, newRoutineName: '   ' }))
      .toEqual({ canConfirm: false, blockedReason: CONVERT_BLOCKED_REASON.NO_ROUTINE_NAME })
  })

  it('is blocked with a blank day name', () => {
    expect(getConvertToRoutineDayState({ ...ready, dayName: ' ' }))
      .toEqual({ canConfirm: false, blockedReason: CONVERT_BLOCKED_REASON.NO_DAY_NAME })
  })

  it('gives no reason while the request is in flight', () => {
    expect(getConvertToRoutineDayState({ ...ready, isPending: true }))
      .toEqual({ canConfirm: false, blockedReason: null })
  })
})

describe('getRoutineDayErrorKey', () => {
  it.each([
    [ROUTINE_DAY_ERROR_TOKENS.INVALID_ARGUMENTS, 'workout:history.convertToDay.errors.invalidArguments'],
    [ROUTINE_DAY_ERROR_TOKENS.UNKNOWN_FIELD, 'workout:history.convertToDay.errors.unknownField'],
    [ROUTINE_DAY_ERROR_TOKENS.NOTHING_TO_COPY, 'workout:history.convertToDay.errors.nothingToCopy'],
    [ROUTINE_DAY_ERROR_TOKENS.ROUTINE_NOT_FOUND, 'workout:history.convertToDay.errors.routineNotFound'],
    [ROUTINE_DAY_ERROR_TOKENS.EXERCISE_NOT_AVAILABLE, 'workout:history.convertToDay.errors.exerciseNotAvailable'],
  ])('maps %s to its message', (token, key) => {
    expect(getRoutineDayErrorKey({ message: `${token}: detail` })).toBe(key)
  })

  it('maps anything else to the generic message', () => {
    expect(getRoutineDayErrorKey({ message: 'network down' })).toBe('workout:history.convertToDay.errors.generic')
    expect(getRoutineDayErrorKey(null)).toBe('workout:history.convertToDay.errors.generic')
  })

  it('has a translation for every key', () => {
    const errors = [...Object.values(ROUTINE_DAY_ERROR_TOKENS), 'other'].map(token => getRoutineDayErrorKey({ message: token }))
    errors.forEach(key => expect(t(key)).not.toBe(key.split(':')[1]))
  })
})

describe('getRoutineDayErrorToken', () => {
  it('reads the token only at the start of the message', () => {
    expect(getRoutineDayErrorToken({ message: 'exercise_not_available' })).toBe(ROUTINE_DAY_ERROR_TOKENS.EXERCISE_NOT_AVAILABLE)
    expect(getRoutineDayErrorToken({ message: 'failed: exercise_not_available' })).toBeNull()
    expect(getRoutineDayErrorToken(undefined)).toBeNull()
  })
})

describe('getConvertToRoutineDaySuccessMessage', () => {
  it('is a single line when nothing was skipped', () => {
    expect(getConvertToRoutineDaySuccessMessage({ deleted: 0, empty: 0 }, t))
      .toBe(t('workout:history.convertToDay.success'))
  })

  it('adds one line per skip reason', () => {
    const message = getConvertToRoutineDaySuccessMessage({ deleted: 2, empty: 1 }, t)

    expect(message.split('\n')).toEqual([
      t('workout:history.convertToDay.success'),
      t('workout:history.convertToDay.skippedDeleted', { count: 2 }),
      t('workout:history.convertToDay.skippedEmpty', { count: 1 }),
    ])
  })
})
