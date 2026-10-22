import { describe, it, expect } from 'vitest'
import {
  ROUTINE_MEMBERSHIP,
  HISTORY_FILTER,
  classifyRoutineMembership,
  filterByRoutineMembership,
  getHistoryFilterOptions,
  resolveHistoryFilter,
  getRoutineMembershipBadgeKey,
} from './routineMembership.js'

const { DAY, ROUTINE, OTHER } = ROUTINE_MEMBERSHIP

describe('classifyRoutineMembership', () => {
  it('the same day is DAY, another day of the routine is ROUTINE, anything else OTHER', () => {
    expect(classifyRoutineMembership(1, 1, [1, 2, 3])).toBe(DAY)
    expect(classifyRoutineMembership(2, 1, [1, 2, 3])).toBe(ROUTINE)
    expect(classifyRoutineMembership(9, 1, [1, 2, 3])).toBe(OTHER)
  })

  it('compares string and number ids as equal (web route params are strings)', () => {
    expect(classifyRoutineMembership('1', 1, [1, 2])).toBe(DAY)
    expect(classifyRoutineMembership(1, '1', ['1', '2'])).toBe(DAY)
    expect(classifyRoutineMembership('2', 1, [1, 2])).toBe(ROUTINE)
    expect(classifyRoutineMembership(2, '1', ['1', '2'])).toBe(ROUTINE)
  })

  it('a session without a day (free, or its day deleted) is OTHER', () => {
    expect(classifyRoutineMembership(null, 1, [1, 2])).toBe(OTHER)
    expect(classifyRoutineMembership(undefined, 1, [1, 2])).toBe(OTHER)
  })

  it('without a current day every session is OTHER, even one on a routine day', () => {
    expect(classifyRoutineMembership(1, null, [1, 2])).toBe(OTHER)
    expect(classifyRoutineMembership(2, undefined, [1, 2])).toBe(OTHER)
    expect(classifyRoutineMembership(null, null, [1, 2])).toBe(OTHER)
  })

  it('day id 0 is a day, not "no day"', () => {
    expect(classifyRoutineMembership(0, 0, [0, 1])).toBe(DAY)
    expect(classifyRoutineMembership(0, 1, [0, 1])).toBe(ROUTINE)
  })

  it('with no known routine days only the same day is recognised', () => {
    expect(classifyRoutineMembership(1, 1, [])).toBe(DAY)
    expect(classifyRoutineMembership(2, 1, [])).toBe(OTHER)
    expect(classifyRoutineMembership(2, 1, null)).toBe(OTHER)
    expect(classifyRoutineMembership(2, 1, undefined)).toBe(OTHER)
  })
})

describe('filterByRoutineMembership', () => {
  const items = [
    { id: 'same', day: 1 },
    { id: 'other-day', day: '2' },
    { id: 'elsewhere', day: 9 },
    { id: 'free', day: null },
  ]
  const getDay = (item) => item.day
  const ids = (list) => list.map(item => item.id)

  it('ALL keeps every item, as the same array', () => {
    expect(filterByRoutineMembership(items, HISTORY_FILTER.ALL, getDay, 1, [1, 2])).toBe(items)
  })

  it('ROUTINE keeps the same day and the other days of the routine', () => {
    expect(ids(filterByRoutineMembership(items, HISTORY_FILTER.ROUTINE, getDay, 1, [1, 2]))).toEqual(['same', 'other-day'])
  })

  it('ROUTINE keeps same-day items even when the routine days are unknown', () => {
    expect(ids(filterByRoutineMembership(items, HISTORY_FILTER.ROUTINE, getDay, '1', []))).toEqual(['same'])
  })

  it('DAY keeps only the same day', () => {
    expect(ids(filterByRoutineMembership(items, HISTORY_FILTER.DAY, getDay, '1', ['1', '2']))).toEqual(['same'])
  })

  it('without a current day DAY and ROUTINE keep nothing', () => {
    expect(filterByRoutineMembership(items, HISTORY_FILTER.DAY, getDay, null, [1, 2])).toEqual([])
    expect(filterByRoutineMembership(items, HISTORY_FILTER.ROUTINE, getDay, null, [1, 2])).toEqual([])
  })

  it('an empty list stays empty', () => {
    expect(filterByRoutineMembership([], HISTORY_FILTER.DAY, getDay, 1, [1])).toEqual([])
  })

  it('a list not loaded yet comes back as is, so "loading" is not read as "no rows"', () => {
    expect(filterByRoutineMembership(undefined, HISTORY_FILTER.DAY, getDay, 1, [1])).toBeUndefined()
    expect(filterByRoutineMembership(null, HISTORY_FILTER.ROUTINE, getDay, 1, [1])).toBeNull()
  })

  it('an unknown filter keeps everything', () => {
    expect(filterByRoutineMembership(items, 'nope', getDay, 1, [1, 2])).toBe(items)
  })
})

describe('getHistoryFilterOptions', () => {
  const values = (options) => options.map(option => option.value)

  it('no current day: no selector', () => {
    expect(getHistoryFilterOptions({ hasRoutineDay: false, routineDaysKnown: true })).toEqual([])
    expect(getHistoryFilterOptions({ hasRoutineDay: false, routineDaysKnown: false })).toEqual([])
  })

  it('a day with its routine known: all, this routine, this day, in that order', () => {
    const options = getHistoryFilterOptions({ hasRoutineDay: true, routineDaysKnown: true })
    expect(values(options)).toEqual([HISTORY_FILTER.ALL, HISTORY_FILTER.ROUTINE, HISTORY_FILTER.DAY])
    expect(options.map(option => option.labelKey)).toEqual(['exercise:filterAll', 'exercise:filterRoutine', 'exercise:filterDay'])
  })

  it('a day whose routine days are unknown drops "this routine"', () => {
    expect(values(getHistoryFilterOptions({ hasRoutineDay: true, routineDaysKnown: false })))
      .toEqual([HISTORY_FILTER.ALL, HISTORY_FILTER.DAY])
  })
})

describe('resolveHistoryFilter', () => {
  const full = getHistoryFilterOptions({ hasRoutineDay: true, routineDaysKnown: true })
  const degraded = getHistoryFilterOptions({ hasRoutineDay: true, routineDaysKnown: false })

  it('keeps the selected filter while it is offered', () => {
    expect(resolveHistoryFilter(HISTORY_FILTER.ROUTINE, full)).toBe(HISTORY_FILTER.ROUTINE)
    expect(resolveHistoryFilter(HISTORY_FILTER.DAY, degraded)).toBe(HISTORY_FILTER.DAY)
  })

  it('falls back to ALL when the selected segment is not offered', () => {
    expect(resolveHistoryFilter(HISTORY_FILTER.ROUTINE, degraded)).toBe(HISTORY_FILTER.ALL)
    expect(resolveHistoryFilter(HISTORY_FILTER.DAY, [])).toBe(HISTORY_FILTER.ALL)
  })
})

describe('getRoutineMembershipBadgeKey', () => {
  it('marks the same day and the other days of the routine, nothing else', () => {
    expect(getRoutineMembershipBadgeKey(DAY)).toBe('exercise:badgeThisDay')
    expect(getRoutineMembershipBadgeKey(ROUTINE)).toBe('exercise:badgeOtherDay')
    expect(getRoutineMembershipBadgeKey(OTHER)).toBeNull()
    expect(getRoutineMembershipBadgeKey(null)).toBeNull()
  })
})
