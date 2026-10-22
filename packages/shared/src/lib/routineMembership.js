// Where a past session of an exercise sits relative to the routine day the history is opened
// from. The history modal marks each session with it and filters its list, chart and records.

/** Where one session belongs. */
export const ROUTINE_MEMBERSHIP = Object.freeze({ DAY: 'day', ROUTINE: 'routine', OTHER: 'other' })

/** Which sessions the history shows. `ROUTINE` keeps the same day too: it is the whole routine. */
export const HISTORY_FILTER = Object.freeze({ ALL: 'all', ROUTINE: 'routine', DAY: 'day' })

const KEPT_BY_FILTER = {
  [HISTORY_FILTER.ROUTINE]: [ROUTINE_MEMBERSHIP.DAY, ROUTINE_MEMBERSHIP.ROUTINE],
  [HISTORY_FILTER.DAY]: [ROUTINE_MEMBERSHIP.DAY],
}

const FILTER_LABEL_KEYS = {
  [HISTORY_FILTER.ALL]: 'exercise:filterAll',
  [HISTORY_FILTER.ROUTINE]: 'exercise:filterRoutine',
  [HISTORY_FILTER.DAY]: 'exercise:filterDay',
}

const BADGE_LABEL_KEYS = {
  [ROUTINE_MEMBERSHIP.DAY]: 'exercise:badgeThisDay',
  [ROUTINE_MEMBERSHIP.ROUTINE]: 'exercise:badgeOtherDay',
}

/**
 * Ids are compared as strings: web route params are strings, native ones numbers. A session
 * without a day (free, or its day deleted: the FK sets NULL) is OTHER, and so is every session
 * when the history has no current day.
 * @param {number|string|null} sessionRoutineDayId
 * @param {number|string|null} currentRoutineDayId
 * @param {Array<number|string>} routineDayIds - Every day of the current routine.
 * @returns {string} A ROUTINE_MEMBERSHIP value.
 */
export function classifyRoutineMembership(sessionRoutineDayId, currentRoutineDayId, routineDayIds) {
  if (sessionRoutineDayId == null || currentRoutineDayId == null) return ROUTINE_MEMBERSHIP.OTHER
  const sessionDay = String(sessionRoutineDayId)
  if (sessionDay === String(currentRoutineDayId)) return ROUTINE_MEMBERSHIP.DAY
  if ((routineDayIds ?? []).some(id => String(id) === sessionDay)) return ROUTINE_MEMBERSHIP.ROUTINE
  return ROUTINE_MEMBERSHIP.OTHER
}

/**
 * The items the filter keeps. `ALL` returns `items` itself. A non-array (a query still loading)
 * comes back as is, so a caller telling "no data yet" from "no rows" keeps telling them apart.
 * @param {Array|undefined|null} items
 * @param {string} filter - A HISTORY_FILTER value.
 * @param {(item: object) => number|string|null} getRoutineDayId
 * @param {number|string|null} currentRoutineDayId
 * @param {Array<number|string>} routineDayIds
 */
export function filterByRoutineMembership(items, filter, getRoutineDayId, currentRoutineDayId, routineDayIds) {
  const kept = KEPT_BY_FILTER[filter]
  if (!Array.isArray(items) || !kept) return items
  return items.filter(item =>
    kept.includes(classifyRoutineMembership(getRoutineDayId(item), currentRoutineDayId, routineDayIds))
  )
}

/**
 * The selector's segments. Without a current day there is nothing to filter by: no selector.
 * Without the routine's days (no routine id, or they failed to load) "this routine" cannot be
 * told apart from "not in it", so its segment goes rather than show a guess.
 * @param {{ hasRoutineDay: boolean, routineDaysKnown: boolean }} params
 * @returns {Array<{ value: string, labelKey: string }>}
 */
export function getHistoryFilterOptions({ hasRoutineDay, routineDaysKnown }) {
  if (!hasRoutineDay) return []
  const values = routineDaysKnown
    ? [HISTORY_FILTER.ALL, HISTORY_FILTER.ROUTINE, HISTORY_FILTER.DAY]
    : [HISTORY_FILTER.ALL, HISTORY_FILTER.DAY]
  return values.map(value => ({ value, labelKey: FILTER_LABEL_KEYS[value] }))
}

/**
 * The filter in effect: the selected one while the selector offers it, else ALL (no selector, or
 * its "this routine" segment went away).
 * @param {string} selected - A HISTORY_FILTER value.
 * @param {Array<{ value: string }>} options - From `getHistoryFilterOptions`.
 */
export function resolveHistoryFilter(selected, options) {
  return options.some(option => option.value === selected) ? selected : HISTORY_FILTER.ALL
}

/**
 * The i18n key of a session's mark, or null for none (OTHER, or no membership at all).
 * @param {string|null} membership - A ROUTINE_MEMBERSHIP value.
 */
export function getRoutineMembershipBadgeKey(membership) {
  return BADGE_LABEL_KEYS[membership] ?? null
}
