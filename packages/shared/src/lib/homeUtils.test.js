import { describe, it, expect } from 'vitest'
import {
  getGreetingKey,
  getNextRoutineDay,
  transformSessionsToCycleDurationChart,
  calculateWeeklyDurationMinutes,
  formatDurationHoursMinutes,
} from './homeUtils.js'

// ============================================
// getGreetingKey
// ============================================

describe('getGreetingKey', () => {
  it('returns morning key for hours 0-11', () => {
    expect(getGreetingKey(0)).toBe('common:home.greetingMorning')
    expect(getGreetingKey(6)).toBe('common:home.greetingMorning')
    expect(getGreetingKey(11)).toBe('common:home.greetingMorning')
  })

  it('returns afternoon key for hours 12-17', () => {
    expect(getGreetingKey(12)).toBe('common:home.greetingAfternoon')
    expect(getGreetingKey(15)).toBe('common:home.greetingAfternoon')
    expect(getGreetingKey(17)).toBe('common:home.greetingAfternoon')
  })

  it('returns evening key for hours 18-23', () => {
    expect(getGreetingKey(18)).toBe('common:home.greetingEvening')
    expect(getGreetingKey(21)).toBe('common:home.greetingEvening')
    expect(getGreetingKey(23)).toBe('common:home.greetingEvening')
  })
})

// ============================================
// getNextRoutineDay
// ============================================

describe('getNextRoutineDay', () => {
  const days = [
    { id: 1, name: 'Push', sort_order: 1 },
    { id: 2, name: 'Pull', sort_order: 2 },
    { id: 3, name: 'Legs', sort_order: 3 },
  ]

  it('returns first day when no last completed', () => {
    expect(getNextRoutineDay(days, null)).toEqual(days[0])
    expect(getNextRoutineDay(days, undefined)).toEqual(days[0])
  })

  it('returns next day in sequence', () => {
    expect(getNextRoutineDay(days, 1)).toEqual(days[1])
    expect(getNextRoutineDay(days, 2)).toEqual(days[2])
  })

  it('wraps around to first day after last', () => {
    expect(getNextRoutineDay(days, 3)).toEqual(days[0])
  })

  it('returns first day if lastCompletedDayId not found', () => {
    expect(getNextRoutineDay(days, 999)).toEqual(days[0])
  })

  it('returns null for empty array', () => {
    expect(getNextRoutineDay([], null)).toBeNull()
    expect(getNextRoutineDay(null, null)).toBeNull()
  })

  it('returns the only day for single-day routine', () => {
    const single = [{ id: 10, name: 'Full Body', sort_order: 1 }]
    expect(getNextRoutineDay(single, 10)).toEqual(single[0])
    expect(getNextRoutineDay(single, null)).toEqual(single[0])
  })
})

// ============================================
// transformSessionsToCycleDurationChart
// ============================================

describe('transformSessionsToCycleDurationChart', () => {
  const cycleDays = [
    { label: 'L', dateStr: '2026-04-06', hasSession: true },
    { label: 'M', dateStr: '2026-04-07', hasSession: false },
    { label: 'X', dateStr: '2026-04-08', hasSession: true },
    { label: 'J', dateStr: '2026-04-09', hasSession: false },
    { label: 'V', dateStr: '2026-04-10', hasSession: false },
    { label: 'S', dateStr: '2026-04-11', hasSession: false },
    { label: 'D', dateStr: '2026-04-12', hasSession: false },
  ]

  const sessions = [
    { completed_at: '2026-04-06T10:00:00Z', duration_minutes: 60 },
    { completed_at: '2026-04-08T18:00:00Z', duration_minutes: 45 },
  ]

  it('maps duration to correct days', () => {
    const result = transformSessionsToCycleDurationChart(cycleDays, sessions)
    expect(result).toHaveLength(7)
    expect(result[0].label).toBe('L')
    expect(result[0].durationMinutes).toBe(60)
    expect(result[2].durationMinutes).toBe(45)
    expect(result[1].durationMinutes).toBe(0)
  })

  it('sums multiple sessions on same day', () => {
    const doubleSessions = [
      { completed_at: '2026-04-06T08:00:00Z', duration_minutes: 30 },
      { completed_at: '2026-04-06T18:00:00Z', duration_minutes: 25 },
    ]
    const result = transformSessionsToCycleDurationChart(cycleDays, doubleSessions)
    expect(result[0].durationMinutes).toBe(55)
  })

  it('returns empty array for empty cycleDays', () => {
    expect(transformSessionsToCycleDurationChart([], sessions)).toEqual([])
    expect(transformSessionsToCycleDurationChart(null, sessions)).toEqual([])
  })

  it('handles null/empty sessions', () => {
    const result = transformSessionsToCycleDurationChart(cycleDays, null)
    expect(result.every(d => d.durationMinutes === 0)).toBe(true)
  })

  it('ignores sessions without duration_minutes', () => {
    const incomplete = [{ completed_at: '2026-04-06T10:00:00Z', duration_minutes: null }]
    const result = transformSessionsToCycleDurationChart(cycleDays, incomplete)
    expect(result[0].durationMinutes).toBe(0)
  })
})

// ============================================
// calculateWeeklyDurationMinutes
// ============================================

describe('calculateWeeklyDurationMinutes', () => {
  it('sums duration_minutes', () => {
    const sessions = [
      { duration_minutes: 60 },
      { duration_minutes: 45 },
      { duration_minutes: 30 },
    ]
    expect(calculateWeeklyDurationMinutes(sessions)).toBe(135)
  })

  it('returns 0 for empty/null input', () => {
    expect(calculateWeeklyDurationMinutes([])).toBe(0)
    expect(calculateWeeklyDurationMinutes(null)).toBe(0)
  })

  it('ignores sessions without duration', () => {
    const sessions = [{ duration_minutes: 60 }, { duration_minutes: null }, { duration_minutes: 30 }]
    expect(calculateWeeklyDurationMinutes(sessions)).toBe(90)
  })
})

// ============================================
// formatDurationHoursMinutes
// ============================================

describe('formatDurationHoursMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatDurationHoursMinutes(90)).toEqual({ hours: 1, minutes: 30 })
    expect(formatDurationHoursMinutes(260)).toEqual({ hours: 4, minutes: 20 })
  })

  it('handles zero', () => {
    expect(formatDurationHoursMinutes(0)).toEqual({ hours: 0, minutes: 0 })
  })

  it('handles minutes only', () => {
    expect(formatDurationHoursMinutes(45)).toEqual({ hours: 0, minutes: 45 })
  })

  it('handles null/negative', () => {
    expect(formatDurationHoursMinutes(null)).toEqual({ hours: 0, minutes: 0 })
    expect(formatDurationHoursMinutes(-10)).toEqual({ hours: 0, minutes: 0 })
  })

  it('handles exact hours', () => {
    expect(formatDurationHoursMinutes(120)).toEqual({ hours: 2, minutes: 0 })
  })
})
