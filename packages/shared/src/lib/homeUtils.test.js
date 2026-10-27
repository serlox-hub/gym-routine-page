import { describe, it, expect } from 'vitest'
import {
  getGreetingKey,
  getNextRoutineDay,
  transformSessionsToCycleDurationChart,
  getViewedCycle,
  getPaginationDots,
  calculateWeeklyDurationMinutes,
  formatDurationHoursMinutes,
  getCycleReferenceDate,
  getWeekQueryRange,
  getRelativeWeek,
  getViewedWeekLabel,
  VIEWED_WEEK_LABELS,
  getCycleTotalMinutes,
  shouldResetViewedWeek,
  selectViewedCycleOffset,
  HOME_WEEK_RESET_MS,
} from './homeUtils.js'

const FORMAT = { dayLabels: ['D', 'L', 'M', 'X', 'J', 'V', 'S'], locale: 'es' }

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
// getViewedCycle
// ============================================

describe('getViewedCycle', () => {
  // Fijo: jueves 19 marzo 2026. Nunca el reloj real.
  const now = new Date(2026, 2, 19, 12, 0)

  it('las sesiones de la semana visible aparecen como barras con duración en su dateStr', () => {
    const goal = {
      sessions: [
        { completed_at: '2026-03-16T10:00:00Z', duration_minutes: 30 }, // lunes, ciclo actual
        { completed_at: '2026-03-09T10:00:00Z', duration_minutes: 45 }, // ciclo anterior
      ],
      weekStartDay: 'monday',
    }
    const result = getViewedCycle(goal, 0, now, FORMAT)

    expect(result.cycleKey).toBe('2026-03-16')
    const monday = result.chartData.find(d => d.dateStr === '2026-03-16')
    expect(monday.durationMinutes).toBe(30)
    expect(result.chartData.some(d => d.dateStr === '2026-03-09')).toBe(false)
  })

  it('un cycleOffset negativo se desplaza al ciclo anterior', () => {
    const goal = {
      sessions: [
        { completed_at: '2026-03-16T10:00:00Z', duration_minutes: 30 }, // ciclo actual
        { completed_at: '2026-03-09T10:00:00Z', duration_minutes: 45 }, // ciclo anterior
      ],
      weekStartDay: 'monday',
    }
    const current = getViewedCycle(goal, 0, now, FORMAT)
    const previous = getViewedCycle(goal, -1, now, FORMAT)

    expect(previous.cycleKey).toBe('2026-03-09')
    expect(previous.chartData.find(d => d.dateStr === '2026-03-09').durationMinutes).toBe(45)
    expect(current.chartData.find(d => d.dateStr === '2026-03-16').durationMinutes).toBe(30)
    expect(current.chartData.every(d => d.dateStr !== '2026-03-09')).toBe(true)
  })

  it('weekStartDay "sunday" desplaza los límites de la semana frente a "monday"', () => {
    const base = { sessions: [], weekStartDay: 'monday' }
    const monday = getViewedCycle(base, 0, now, FORMAT)
    const sunday = getViewedCycle({ ...base, weekStartDay: 'sunday' }, 0, now, FORMAT)

    expect(monday.cycleKey).toBe('2026-03-16')
    expect(monday.chartData[0].dateStr).toBe('2026-03-16')
    expect(monday.chartData[6].dateStr).toBe('2026-03-22')

    expect(sunday.cycleKey).toBe('2026-03-15')
    expect(sunday.chartData[0].dateStr).toBe('2026-03-15')
    expect(sunday.chartData[6].dateStr).toBe('2026-03-21')
  })

  it('usa las iniciales y el idioma del rango que le pasan', () => {
    const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    const result = getViewedCycle({ weekStartDay: 'monday' }, 0, now, { dayLabels: labels, locale: 'en' })

    expect(result.chartData.map(d => d.label)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
    expect(result.dateRangeLabel).toBe(`${new Date(2026, 2, 16).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – ${new Date(2026, 2, 22).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`)
    expect(result.dateRangeLabel).not.toBe(getViewedCycle({ weekStartDay: 'monday' }, 0, now, FORMAT).dateRangeLabel)
  })

  it('isRest es true solo si la clave del ciclo visible está en restCycles', () => {
    const goal = {
      sessions: [],
      restCycles: ['2026-03-16'], // clave del ciclo actual
      weekStartDay: 'monday',
    }
    expect(getViewedCycle(goal, 0, now, FORMAT).isRest).toBe(true)
    expect(getViewedCycle(goal, -1, now, FORMAT).isRest).toBe(false) // ciclo anterior: 2026-03-09
  })

  it('progress.completed cuenta solo las sesiones del ciclo visible', () => {
    const goal = {
      sessions: [
        { completed_at: '2026-03-16T10:00:00Z' },
        { completed_at: '2026-03-17T10:00:00Z' },
        { completed_at: '2026-03-09T10:00:00Z' }, // ciclo anterior
      ],
      daysPerCycle: 3,
      weekStartDay: 'monday',
    }
    expect(getViewedCycle(goal, 0, now, FORMAT).progress).toMatchObject({ completed: 2, target: 3, isComplete: false })
    expect(getViewedCycle(goal, -1, now, FORMAT).progress.completed).toBe(1)
  })

  it('un objetivo sin configurar (sin daysPerCycle ni restCycles) no lanza y devuelve datos de gráfica', () => {
    const goal = {
      sessions: [{ completed_at: '2026-03-16T10:00:00Z', duration_minutes: 20 }],
      weekStartDay: 'monday',
    }
    expect(() => getViewedCycle(goal, 0, now, FORMAT)).not.toThrow()

    const result = getViewedCycle(goal, 0, now, FORMAT)
    expect(result.chartData).toHaveLength(7)
    expect(result.isRest).toBe(false)
    expect(result.progress.target).toBeUndefined()
  })

  it('sin sesiones (goal vacío) todas las barras quedan a cero', () => {
    expect(() => getViewedCycle({}, 0, now, FORMAT)).not.toThrow()

    const result = getViewedCycle({}, 0, now, FORMAT)
    expect(result.chartData).toHaveLength(7)
    expect(result.chartData.every(d => d.durationMinutes === 0)).toBe(true)
    expect(result.progress.completed).toBe(0)
  })
})

// ============================================
// Viewed week (streak card + stats row)
// ============================================

describe('getCycleReferenceDate', () => {
  // Thursday 19 March 2026, 12:00 local
  const now = new Date(2026, 2, 19, 12, 0)

  it('offset 0 is now itself', () => {
    expect(getCycleReferenceDate(0, now).getTime()).toBe(now.getTime())
  })

  it('goes back whole weeks keeping the weekday and the time of day', () => {
    expect(getCycleReferenceDate(-1, now)).toEqual(new Date(2026, 2, 12, 12, 0))
    expect(getCycleReferenceDate(-12, now)).toEqual(new Date(2025, 11, 25, 12, 0))
  })

  it('does not mutate now', () => {
    getCycleReferenceDate(-3, now)
    expect(now).toEqual(new Date(2026, 2, 19, 12, 0))
  })

  it('is the reference getViewedCycle uses', () => {
    const viewed = getViewedCycle({ weekStartDay: 'monday' }, -12, now, FORMAT)
    expect(viewed.cycleKey).toBe('2025-12-22')
  })
})

describe('getWeekQueryRange', () => {
  const now = new Date(2026, 2, 19, 12, 0)

  it('offset 0 is the current week: local start of its first day to 23:59:59 of its last', () => {
    expect(getWeekQueryRange(0, now, 'monday')).toEqual({
      from: new Date(2026, 2, 16, 0, 0, 0).toISOString(),
      to: new Date(2026, 2, 22, 23, 59, 59).toISOString(),
    })
  })

  it('offset -1 with a monday start is the previous monday to sunday', () => {
    expect(getWeekQueryRange(-1, now, 'monday')).toEqual({
      from: new Date(2026, 2, 9, 0, 0, 0).toISOString(),
      to: new Date(2026, 2, 15, 23, 59, 59).toISOString(),
    })
  })

  it('offset -1 with a sunday start is the previous sunday to saturday', () => {
    expect(getWeekQueryRange(-1, now, 'sunday')).toEqual({
      from: new Date(2026, 2, 8, 0, 0, 0).toISOString(),
      to: new Date(2026, 2, 14, 23, 59, 59).toISOString(),
    })
  })

  it('defaults to a monday start', () => {
    expect(getWeekQueryRange(0, now)).toEqual(getWeekQueryRange(0, now, 'monday'))
  })
})

describe('getRelativeWeek', () => {
  it('0 and any positive value are the current week', () => {
    expect(getRelativeWeek(0)).toEqual({ kind: 'current' })
    expect(getRelativeWeek(1)).toEqual({ kind: 'current' })
  })

  it('-1 is last week', () => {
    expect(getRelativeWeek(-1)).toEqual({ kind: 'last' })
  })

  it('-2 and further back are N weeks ago', () => {
    expect(getRelativeWeek(-2)).toEqual({ kind: 'ago', weeks: 2 })
    expect(getRelativeWeek(-12)).toEqual({ kind: 'ago', weeks: 12 })
  })
})

describe('getViewedWeekLabel', () => {
  it('the current week keeps the existing key, with no values', () => {
    expect(getViewedWeekLabel(0, VIEWED_WEEK_LABELS.totalTime)).toEqual({ key: 'common:home.thisWeek' })
  })

  it('last week uses its own key', () => {
    expect(getViewedWeekLabel(-1, VIEWED_WEEK_LABELS.prs)).toEqual({ key: 'common:home.prsLastWeek' })
  })

  it('further back passes the number of weeks as count', () => {
    expect(getViewedWeekLabel(-3, VIEWED_WEEK_LABELS.prsTitle))
      .toEqual({ key: 'common:home.weeklyPRsTitleWeeksAgo', values: { count: 3 } })
  })
})

describe('getCycleTotalMinutes', () => {
  const now = new Date(2026, 2, 19, 12, 0)
  const sessions = [
    { completed_at: new Date(2026, 2, 16, 10, 0).toISOString(), duration_minutes: 30 }, // this week
    { completed_at: new Date(2026, 2, 18, 19, 0).toISOString(), duration_minutes: 50 }, // this week
    { completed_at: new Date(2026, 2, 9, 10, 0).toISOString(), duration_minutes: 45 }, // last week, first day
    { completed_at: new Date(2026, 2, 15, 23, 30).toISOString(), duration_minutes: 20 }, // last week, last day
    { completed_at: new Date(2026, 2, 12, 10, 0).toISOString(), duration_minutes: null }, // last week, no duration
    { completed_at: new Date(2026, 2, 2, 10, 0).toISOString(), duration_minutes: 60 }, // two weeks ago
  ]

  it('sums only the sessions of the viewed week', () => {
    expect(getCycleTotalMinutes(sessions, 0, now, 'monday')).toBe(80)
    expect(getCycleTotalMinutes(sessions, -1, now, 'monday')).toBe(65)
    expect(getCycleTotalMinutes(sessions, -2, now, 'monday')).toBe(60)
  })

  it('follows the week start: with sunday, sunday the 15th belongs to the current week', () => {
    expect(getCycleTotalMinutes(sessions, 0, now, 'sunday')).toBe(100)
    expect(getCycleTotalMinutes(sessions, -1, now, 'sunday')).toBe(45)
  })

  it('a week without sessions, an empty list or no list is 0', () => {
    expect(getCycleTotalMinutes(sessions, -5, now, 'monday')).toBe(0)
    expect(getCycleTotalMinutes([], 0, now, 'monday')).toBe(0)
    expect(getCycleTotalMinutes(null, 0, now, 'monday')).toBe(0)
  })

  it('equals the sum of the streak card bars for the same inputs', () => {
    for (const weekStartDay of ['monday', 'sunday']) {
      for (const offset of [0, -1, -2]) {
        const bars = getViewedCycle({ sessions, weekStartDay }, offset, now, FORMAT).chartData
        const barsTotal = bars.reduce((sum, bar) => sum + bar.durationMinutes, 0)
        expect(getCycleTotalMinutes(sessions, offset, now, weekStartDay)).toBe(barsTotal)
      }
    }
  })
})

describe('shouldResetViewedWeek', () => {
  // Wednesday 18 March 2026, 12:00 local: the monday and sunday weeks both started days before
  const leftAt = new Date(2026, 2, 18, 12, 0).getTime()
  const MINUTE = 60 * 1000

  it('never left Home: no reset', () => {
    expect(shouldResetViewedWeek(null, leftAt, 'monday')).toBe(false)
  })

  it('back in 14:59 within the same week: no reset', () => {
    expect(shouldResetViewedWeek(leftAt, leftAt + 14 * MINUTE + 59 * 1000, 'monday')).toBe(false)
  })

  it('exactly the window: no reset yet', () => {
    expect(shouldResetViewedWeek(leftAt, leftAt + HOME_WEEK_RESET_MS, 'monday')).toBe(false)
  })

  it('back in 15:01: reset', () => {
    expect(shouldResetViewedWeek(leftAt, leftAt + 15 * MINUTE + 1000, 'monday')).toBe(true)
  })

  it('back in one minute but across the start of a monday week: reset', () => {
    const sundayNight = new Date(2026, 2, 22, 23, 59, 30).getTime()
    expect(shouldResetViewedWeek(sundayNight, sundayNight + MINUTE, 'monday')).toBe(true)
    // The same minute is mid-week with a sunday start
    expect(shouldResetViewedWeek(sundayNight, sundayNight + MINUTE, 'sunday')).toBe(false)
  })

  it('back in one minute but across the start of a sunday week: reset', () => {
    const saturdayNight = new Date(2026, 2, 21, 23, 59, 30).getTime()
    expect(shouldResetViewedWeek(saturdayNight, saturdayNight + MINUTE, 'sunday')).toBe(true)
    expect(shouldResetViewedWeek(saturdayNight, saturdayNight + MINUTE, 'monday')).toBe(false)
  })
})

describe('selectViewedCycleOffset', () => {
  const now = new Date(2026, 2, 18, 12, 0).getTime()

  it('on Home (leftAt null) returns the stored offset', () => {
    expect(selectViewedCycleOffset({ cycleOffset: -4, leftAt: null }, now, 'monday')).toBe(-4)
  })

  it('back within the window returns the stored offset', () => {
    expect(selectViewedCycleOffset({ cycleOffset: -4, leftAt: now - 60 * 1000 }, now, 'monday')).toBe(-4)
  })

  it('due for reset returns the current week', () => {
    expect(selectViewedCycleOffset({ cycleOffset: -4, leftAt: now - HOME_WEEK_RESET_MS - 1 }, now, 'monday')).toBe(0)
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

// ============================================
// getViewedCycle: porcentaje y valores null
// ============================================

describe('getViewedCycle (porcentaje y null)', () => {
  const now = new Date(2026, 2, 19, 12, 0)
  const twoSessions = [
    { completed_at: '2026-03-16T10:00:00Z', duration_minutes: 30 },
    { completed_at: '2026-03-17T10:00:00Z', duration_minutes: 30 },
  ]

  it('calcula el porcentaje de progreso sobre el objetivo', () => {
    const { progress } = getViewedCycle({ sessions: twoSessions, daysPerCycle: 4 }, 0, now, FORMAT)
    expect(progress.percent).toBe(50)
  })

  it('el porcentaje no pasa de 100 si se supera el objetivo', () => {
    const { progress } = getViewedCycle({ sessions: twoSessions, daysPerCycle: 1 }, 0, now, FORMAT)
    expect(progress.percent).toBe(100)
  })

  it('sin objetivo el porcentaje es 0', () => {
    const { progress } = getViewedCycle({ sessions: twoSessions }, 0, now, FORMAT)
    expect(progress.percent).toBe(0)
  })

  it('acepta sessions, restCycles y weekStartDay en null', () => {
    const result = getViewedCycle({ sessions: null, restCycles: null, weekStartDay: null, daysPerCycle: 3 }, 0, now, FORMAT)
    expect(result.chartData).toHaveLength(7)
    expect(result.chartData.every(d => d.durationMinutes === 0)).toBe(true)
    expect(result.isRest).toBe(false)
    expect(result.chartData[0].dateStr).toBe('2026-03-16')
  })
})

// ============================================
// getPaginationDots
// ============================================

describe('getPaginationDots', () => {
  it('con pocos ciclos enseña todos, sin extremos encogidos', () => {
    const dots = getPaginationDots(-1, -2, 0)
    expect(dots.map(d => d.dotIndex)).toEqual([0, 1, 2])
    expect(dots.map(d => d.isActive)).toEqual([false, true, false])
    expect(dots.some(d => d.isEdge)).toBe(false)
  })

  it('en el ciclo actual (el último) la ventana queda pegada al final', () => {
    const dots = getPaginationDots(0, -12, 0)
    expect(dots.map(d => d.dotIndex)).toEqual([8, 9, 10, 11, 12])
    expect(dots[4]).toEqual({ dotIndex: 12, isActive: true, isEdge: false, size: 8 })
    expect(dots[0]).toMatchObject({ isEdge: true, size: 4 })
  })

  it('en el ciclo más antiguo la ventana queda pegada al principio', () => {
    const dots = getPaginationDots(-12, -12, 0)
    expect(dots.map(d => d.dotIndex)).toEqual([0, 1, 2, 3, 4])
    expect(dots[0].isActive).toBe(true)
    expect(dots[4]).toMatchObject({ isEdge: true, size: 4 })
  })

  it('en medio centra el punto activo con los dos extremos encogidos', () => {
    const dots = getPaginationDots(-6, -12, 0)
    expect(dots.map(d => d.dotIndex)).toEqual([4, 5, 6, 7, 8])
    expect(dots[2]).toMatchObject({ isActive: true, size: 8 })
    expect(dots.map(d => d.size)).toEqual([4, 6, 8, 6, 4])
  })
})
