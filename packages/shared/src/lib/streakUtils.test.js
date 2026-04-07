import { describe, it, expect } from 'vitest'
import {
  getISOWeekKey,
  getMonday,
  countSessionsByWeek,
  calculateStreakByWeek,
  getCurrentWeekProgress,
  isCurrentWeekRest,
  getCycleStart,
  getCycleKey,
  countSessionsByCycle,
  calculateStreak,
  getCurrentCycleProgress,
  isCurrentCycleRest,
  getCurrentCycleKey,
  getCurrentCycleDays,
  getCycleDateRange,
} from './streakUtils.js'

// ============================================
// LEGACY (semanas ISO)
// ============================================

describe('getMonday', () => {
  it('devuelve lunes para un miercoles', () => {
    const wed = new Date(2026, 2, 18) // miercoles 18 marzo 2026
    const monday = getMonday(wed)
    expect(monday.getDay()).toBe(1)
    expect(monday.getDate()).toBe(16)
  })

  it('devuelve lunes para un domingo', () => {
    const sun = new Date(2026, 2, 22) // domingo
    const monday = getMonday(sun)
    expect(monday.getDate()).toBe(16)
  })

  it('devuelve el mismo dia si ya es lunes', () => {
    const mon = new Date(2026, 2, 16)
    const monday = getMonday(mon)
    expect(monday.getDay()).toBe(1)
    expect(monday.getDate()).toBe(16)
  })
})

describe('getISOWeekKey', () => {
  it('devuelve clave correcta para una fecha conocida', () => {
    // 2026-03-16 es lunes de la semana 12
    expect(getISOWeekKey(new Date('2026-03-16'))).toBe('2026-W12')
    expect(getISOWeekKey(new Date('2026-03-22'))).toBe('2026-W12') // domingo misma semana
  })

  it('semana 1 del ano', () => {
    expect(getISOWeekKey(new Date('2026-01-05'))).toBe('2026-W02')
  })
})

describe('countSessionsByWeek', () => {
  it('cuenta sesiones agrupadas por semana', () => {
    const sessions = [
      { completed_at: '2026-03-16T10:00:00Z' },
      { completed_at: '2026-03-17T10:00:00Z' },
      { completed_at: '2026-03-18T10:00:00Z' },
      { completed_at: '2026-03-09T10:00:00Z' }, // semana anterior
    ]
    const counts = countSessionsByWeek(sessions)
    expect(counts['2026-W12']).toBe(3)
    expect(counts['2026-W11']).toBe(1)
  })

  it('devuelve objeto vacio sin sesiones', () => {
    expect(countSessionsByWeek([])).toEqual({})
  })
})

describe('calculateStreak (legacy)', () => {
  // now = jueves 19 marzo 2026, semana 12
  const now = new Date('2026-03-19T12:00:00Z')

  it('cuenta semanas consecutivas cumplidas', () => {
    const sessionsByWeek = {
      '2026-W12': 4, // semana actual (no cuenta)
      '2026-W11': 4,
      '2026-W10': 3,
      '2026-W09': 4,
    }
    // W11 cumple, W10 cumple (3>=3), W09 cumple -> racha 3
    expect(calculateStreakByWeek(sessionsByWeek, 3, [], now)).toBe(3)
  })

  it('se rompe cuando no cumple', () => {
    const sessionsByWeek = {
      '2026-W11': 4,
      '2026-W10': 1, // no cumple
      '2026-W09': 4,
    }
    expect(calculateStreakByWeek(sessionsByWeek, 3, [], now)).toBe(1)
  })

  it('semanas de descanso se ignoran', () => {
    const sessionsByWeek = {
      '2026-W11': 4,
      '2026-W10': 0, // descanso
      '2026-W09': 4,
    }
    const restWeeks = ['2026-W10']
    expect(calculateStreakByWeek(sessionsByWeek, 3, restWeeks, now)).toBe(2)
  })

  it('racha 0 si semana anterior no cumple', () => {
    const sessionsByWeek = {
      '2026-W11': 1,
    }
    expect(calculateStreakByWeek(sessionsByWeek, 3, [], now)).toBe(0)
  })

  it('racha 0 sin datos', () => {
    expect(calculateStreakByWeek({}, 3, [], now)).toBe(0)
  })

  it('multiples semanas de descanso seguidas no rompen racha', () => {
    const sessionsByWeek = {
      '2026-W11': 3,
      '2026-W10': 0, // descanso
      '2026-W09': 0, // descanso
      '2026-W08': 4,
    }
    const restWeeks = ['2026-W10', '2026-W09']
    expect(calculateStreakByWeek(sessionsByWeek, 3, restWeeks, now)).toBe(2)
  })

  it('superar el objetivo tambien cuenta', () => {
    const sessionsByWeek = {
      '2026-W11': 6, // mas del objetivo
    }
    expect(calculateStreakByWeek(sessionsByWeek, 3, [], now)).toBe(1)
  })

  it('cambio de ano funciona correctamente', () => {
    const nowJan = new Date('2026-01-08T12:00:00Z') // W02
    const sessionsByWeek = {
      '2026-W01': 4,
      '2025-W52': 4,
    }
    expect(calculateStreakByWeek(sessionsByWeek, 3, [], nowJan)).toBe(2)
  })
})

describe('getCurrentWeekProgress', () => {
  const now = new Date('2026-03-19T12:00:00Z')

  it('muestra progreso de la semana actual', () => {
    const sessionsByWeek = { '2026-W12': 2 }
    const result = getCurrentWeekProgress(sessionsByWeek, 4, now)
    expect(result).toEqual({ completed: 2, target: 4, isComplete: false })
  })

  it('marca como completado al alcanzar objetivo', () => {
    const sessionsByWeek = { '2026-W12': 4 }
    const result = getCurrentWeekProgress(sessionsByWeek, 4, now)
    expect(result.isComplete).toBe(true)
  })

  it('maneja semana sin sesiones', () => {
    const result = getCurrentWeekProgress({}, 3, now)
    expect(result.completed).toBe(0)
  })
})

describe('isCurrentWeekRest', () => {
  const now = new Date('2026-03-19T12:00:00Z') // W12

  it('devuelve true si la semana esta marcada', () => {
    expect(isCurrentWeekRest(['2026-W12'], now)).toBe(true)
  })

  it('devuelve false si no esta marcada', () => {
    expect(isCurrentWeekRest(['2026-W11'], now)).toBe(false)
  })

  it('devuelve false con array vacio', () => {
    expect(isCurrentWeekRest([], now)).toBe(false)
  })
})

// ============================================
// CICLOS (nuevo sistema)
// ============================================

describe('getCycleStart', () => {
  it('con cycleLength=7 devuelve lunes de la semana', () => {
    // Ancla: lunes 1 enero 2024. Miercoles 18 marzo 2026 → lunes 16 marzo 2026
    const wed = new Date(2026, 2, 18)
    const start = getCycleStart(wed, 7)
    expect(start.getDay()).toBe(1) // lunes
    expect(start.getDate()).toBe(16)
  })

  it('con cycleLength=10 agrupa en ciclos de 10 dias', () => {
    const date = new Date(2024, 0, 11) // dia 10 desde ancla (1 ene 2024)
    const start = getCycleStart(date, 10)
    expect(start.getDate()).toBe(11) // inicio del segundo ciclo
  })

  it('primer dia del ciclo devuelve el mismo dia', () => {
    const anchor = new Date(2024, 0, 1) // ancla exacta
    const start = getCycleStart(anchor, 7)
    expect(start.getDate()).toBe(1)
  })
})

describe('getCycleKey', () => {
  it('devuelve fecha de inicio como string YYYY-MM-DD', () => {
    const wed = new Date(2026, 2, 18) // miercoles
    const key = getCycleKey(wed, 7)
    expect(key).toBe('2026-03-16') // lunes de esa semana
  })

  it('mismas fechas en el mismo ciclo dan la misma clave', () => {
    const a = getCycleKey(new Date(2026, 2, 16), 7) // lunes
    const b = getCycleKey(new Date(2026, 2, 22), 7) // domingo
    expect(a).toBe(b)
  })

  it('fechas en ciclos distintos dan claves distintas', () => {
    const a = getCycleKey(new Date(2026, 2, 15), 7) // domingo semana anterior
    const b = getCycleKey(new Date(2026, 2, 16), 7) // lunes semana siguiente
    expect(a).not.toBe(b)
  })
})

describe('countSessionsByCycle', () => {
  it('cuenta sesiones por ciclo de 7 dias', () => {
    const sessions = [
      { completed_at: '2026-03-16T10:00:00Z' },
      { completed_at: '2026-03-17T10:00:00Z' },
      { completed_at: '2026-03-09T10:00:00Z' }, // ciclo anterior
    ]
    const counts = countSessionsByCycle(sessions, 7)
    expect(counts['2026-03-16']).toBe(2)
    expect(counts['2026-03-09']).toBe(1)
  })

  it('devuelve objeto vacio sin sesiones', () => {
    expect(countSessionsByCycle([], 7)).toEqual({})
  })

  it('funciona con ciclos de 10 dias', () => {
    // Ancla: 1 enero 2024. Ciclo 1: 1-10 ene, ciclo 2: 11-20 ene
    const sessions = [
      { completed_at: '2024-01-05T10:00:00Z' }, // ciclo 1
      { completed_at: '2024-01-08T10:00:00Z' }, // ciclo 1
      { completed_at: '2024-01-12T10:00:00Z' }, // ciclo 2
    ]
    const counts = countSessionsByCycle(sessions, 10)
    expect(counts['2024-01-01']).toBe(2)
    expect(counts['2024-01-11']).toBe(1)
  })
})

describe('calculateStreak (ciclos)', () => {
  // now = jueves 19 marzo 2026
  const now = new Date('2026-03-19T12:00:00Z')
  const currentKey = getCycleKey(now, 7) // 2026-03-16

  it('cuenta ciclos consecutivos cumplidos', () => {
    const sessionsByCycle = {
      [currentKey]: 4, // ciclo actual (no cuenta)
      '2026-03-09': 4,
      '2026-03-02': 3,
      '2026-02-23': 4,
    }
    expect(calculateStreak(sessionsByCycle, 3, [], 7, now)).toBe(3)
  })

  it('se rompe cuando no cumple', () => {
    const sessionsByCycle = {
      '2026-03-09': 4,
      '2026-03-02': 1, // no cumple
      '2026-02-23': 4,
    }
    expect(calculateStreak(sessionsByCycle, 3, [], 7, now)).toBe(1)
  })

  it('ciclos de descanso se ignoran', () => {
    const sessionsByCycle = {
      '2026-03-09': 4,
      '2026-03-02': 0, // descanso
      '2026-02-23': 4,
    }
    expect(calculateStreak(sessionsByCycle, 3, ['2026-03-02'], 7, now)).toBe(2)
  })

  it('racha 0 sin datos', () => {
    expect(calculateStreak({}, 3, [], 7, now)).toBe(0)
  })

  it('funciona con ciclos de 10 dias', () => {
    const now10 = new Date(2024, 0, 25) // dia 24 desde ancla → ciclo 3 (21-30 ene)
    const sessionsByCycle = {
      '2024-01-11': 5, // ciclo 2 (anterior al actual)
      '2024-01-01': 4, // ciclo 1
    }
    expect(calculateStreak(sessionsByCycle, 3, [], 10, now10)).toBe(2)
  })
})

describe('getCurrentCycleProgress', () => {
  const now = new Date('2026-03-19T12:00:00Z')
  const key = getCycleKey(now, 7)

  it('muestra progreso del ciclo actual', () => {
    const result = getCurrentCycleProgress({ [key]: 2 }, 4, 7, now)
    expect(result).toEqual({ completed: 2, target: 4, isComplete: false })
  })

  it('marca como completado al alcanzar objetivo', () => {
    const result = getCurrentCycleProgress({ [key]: 4 }, 4, 7, now)
    expect(result.isComplete).toBe(true)
  })

  it('maneja ciclo sin sesiones', () => {
    const result = getCurrentCycleProgress({}, 3, 7, now)
    expect(result.completed).toBe(0)
  })
})

describe('isCurrentCycleRest', () => {
  const now = new Date('2026-03-19T12:00:00Z')
  const key = getCycleKey(now, 7)

  it('devuelve true si el ciclo esta marcado', () => {
    expect(isCurrentCycleRest([key], 7, now)).toBe(true)
  })

  it('devuelve false si no esta marcado', () => {
    expect(isCurrentCycleRest(['2026-03-09'], 7, now)).toBe(false)
  })

  it('devuelve false con array vacio', () => {
    expect(isCurrentCycleRest([], 7, now)).toBe(false)
  })
})

describe('getCurrentCycleKey', () => {
  it('devuelve la clave del ciclo actual', () => {
    const now = new Date('2026-03-19T12:00:00Z')
    expect(getCurrentCycleKey(7, now)).toBe('2026-03-16')
  })
})

describe('getCurrentCycleDays', () => {
  const now = new Date(2026, 2, 19, 12, 0) // jueves 19 marzo 2026

  it('devuelve 7 dias para cycleLength=7', () => {
    const days = getCurrentCycleDays([], 7, now)
    expect(days).toHaveLength(7)
  })

  it('devuelve 10 dias para cycleLength=10', () => {
    const days = getCurrentCycleDays([], 10, now)
    expect(days).toHaveLength(10)
  })

  it('marca sesiones correctamente', () => {
    const sessions = [
      { id: 's1', completed_at: '2026-03-16T10:00:00Z' }, // lunes
      { id: 's2', completed_at: '2026-03-19T10:00:00Z' }, // jueves (hoy)
    ]
    const days = getCurrentCycleDays(sessions, 7, now, 'monday', now)

    expect(days[0].hasSession).toBe(true) // lunes
    expect(days[0].sessions[0].id).toBe('s1')
    expect(days[1].hasSession).toBe(false) // martes
    expect(days[3].hasSession).toBe(true) // jueves
    expect(days[3].isToday).toBe(true)
  })

  it('marca dias pasados y futuros', () => {
    const days = getCurrentCycleDays([], 7, now, 'monday', now)
    expect(days[0].isPast).toBe(true) // lunes
    expect(days[3].isToday).toBe(true) // jueves
    expect(days[3].isPast).toBe(false)
    expect(days[6].isPast).toBe(false) // domingo
  })

  it('incluye labels de dia de la semana', () => {
    const days = getCurrentCycleDays([], 7, now)
    expect(days[0].label).toBe('L') // lunes
    expect(days[6].label).toBe('D') // domingo
  })

  it('devuelve array vacio sin sesiones', () => {
    const days = getCurrentCycleDays([], 7, now)
    expect(days.every(d => !d.hasSession)).toBe(true)
  })
})

describe('getCycleDateRange', () => {
  it('devuelve inicio y fin del ciclo de 7 dias', () => {
    const now = new Date(2026, 2, 19) // jueves 19 marzo 2026
    const { start, end } = getCycleDateRange(7, now)
    expect(start.getDate()).toBe(16) // lunes 16
    expect(end.getDate()).toBe(22) // domingo 22
  })

  it('respeta weekStartDay sunday', () => {
    const now = new Date(2026, 2, 19) // jueves 19 marzo 2026
    const { start, end } = getCycleDateRange(7, now, 'sunday')
    expect(start.getDay()).toBe(0) // domingo
    expect(end.getDay()).toBe(6) // sabado
  })
})
