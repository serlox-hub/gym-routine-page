import { describe, it, expect } from 'vitest'
import {
  getISOWeekKey,
  getMonday,
  countSessionsByWeek,
  calculateStreak,
  getCurrentWeekProgress,
  isCurrentWeekRest,
} from './streakUtils.js'

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

describe('calculateStreak', () => {
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
    expect(calculateStreak(sessionsByWeek, 3, [], now)).toBe(3)
  })

  it('se rompe cuando no cumple', () => {
    const sessionsByWeek = {
      '2026-W11': 4,
      '2026-W10': 1, // no cumple
      '2026-W09': 4,
    }
    expect(calculateStreak(sessionsByWeek, 3, [], now)).toBe(1)
  })

  it('semanas de descanso se ignoran', () => {
    const sessionsByWeek = {
      '2026-W11': 4,
      '2026-W10': 0, // descanso
      '2026-W09': 4,
    }
    const restWeeks = ['2026-W10']
    expect(calculateStreak(sessionsByWeek, 3, restWeeks, now)).toBe(2)
  })

  it('racha 0 si semana anterior no cumple', () => {
    const sessionsByWeek = {
      '2026-W11': 1,
    }
    expect(calculateStreak(sessionsByWeek, 3, [], now)).toBe(0)
  })

  it('racha 0 sin datos', () => {
    expect(calculateStreak({}, 3, [], now)).toBe(0)
  })

  it('multiples semanas de descanso seguidas no rompen racha', () => {
    const sessionsByWeek = {
      '2026-W11': 3,
      '2026-W10': 0, // descanso
      '2026-W09': 0, // descanso
      '2026-W08': 4,
    }
    const restWeeks = ['2026-W10', '2026-W09']
    expect(calculateStreak(sessionsByWeek, 3, restWeeks, now)).toBe(2)
  })

  it('superar el objetivo tambien cuenta', () => {
    const sessionsByWeek = {
      '2026-W11': 6, // mas del objetivo
    }
    expect(calculateStreak(sessionsByWeek, 3, [], now)).toBe(1)
  })

  it('cambio de ano funciona correctamente', () => {
    const nowJan = new Date('2026-01-08T12:00:00Z') // W02
    const sessionsByWeek = {
      '2026-W01': 4,
      '2025-W52': 4,
    }
    expect(calculateStreak(sessionsByWeek, 3, [], nowJan)).toBe(2)
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
