import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAdjustedDayOfWeek,
  groupSessionsByDate,
  extractMuscleGroupsFromSessions,
  generateCalendarDays,
  getMonthName,
  getPreviousMonth,
  getNextMonth,
} from './calendarUtils.js'

describe('calendarUtils', () => {
  describe('getAdjustedDayOfWeek', () => {
    it('lunes es 0', () => {
      const monday = new Date('2024-01-15') // Lunes
      expect(getAdjustedDayOfWeek(monday)).toBe(0)
    })

    it('domingo es 6', () => {
      const sunday = new Date('2024-01-14') // Domingo
      expect(getAdjustedDayOfWeek(sunday)).toBe(6)
    })

    it('miércoles es 2', () => {
      const wednesday = new Date('2024-01-17') // Miércoles
      expect(getAdjustedDayOfWeek(wednesday)).toBe(2)
    })

    it('sábado es 5', () => {
      const saturday = new Date('2024-01-13') // Sábado
      expect(getAdjustedDayOfWeek(saturday)).toBe(5)
    })
  })

  describe('groupSessionsByDate', () => {
    it('retorna Map vacío para null', () => {
      const result = groupSessionsByDate(null)
      expect(result.size).toBe(0)
    })

    it('agrupa sesiones por fecha', () => {
      const sessions = [
        { started_at: '2024-01-15T10:00:00Z' },
        { started_at: '2024-01-15T18:00:00Z' },
        { started_at: '2024-01-16T10:00:00Z' },
      ]
      const result = groupSessionsByDate(sessions)
      expect(result.size).toBe(2)
    })

    it('mantiene todas las sesiones del mismo día', () => {
      const sessions = [
        { id: 1, started_at: '2024-01-15T10:00:00Z' },
        { id: 2, started_at: '2024-01-15T18:00:00Z' },
      ]
      const result = groupSessionsByDate(sessions)
      const dayKey = new Date('2024-01-15T10:00:00Z').toDateString()
      expect(result.get(dayKey)).toHaveLength(2)
    })
  })

  describe('extractMuscleGroupsFromSessions', () => {
    it('extrae grupos musculares únicos', () => {
      const sessions = [
        { muscleGroups: ['Pecho', 'Tríceps'] },
        { muscleGroups: ['Pecho', 'Hombros'] },
      ]
      const result = extractMuscleGroupsFromSessions(sessions)
      expect(result).toHaveLength(3)
      expect(result).toContain('Pecho')
      expect(result).toContain('Tríceps')
      expect(result).toContain('Hombros')
    })

    it('maneja sesiones sin muscleGroups', () => {
      const sessions = [{ id: 1 }, { muscleGroups: ['Pecho'] }]
      const result = extractMuscleGroupsFromSessions(sessions)
      expect(result).toEqual(['Pecho'])
    })

    it('retorna array vacío para sesiones vacías', () => {
      expect(extractMuscleGroupsFromSessions([])).toEqual([])
    })
  })

  describe('generateCalendarDays', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-20T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('genera días del mes con nulls al inicio', () => {
      const currentDate = new Date('2024-01-15')
      const result = generateCalendarDays(currentDate, [])

      // Enero 2024 empieza en lunes, así que no hay nulls al inicio
      expect(result[0]).not.toBeNull()
      expect(result[0].day).toBe(1)
    })

    it('genera días con sesiones', () => {
      const currentDate = new Date('2024-01-15')
      const sessions = [
        { started_at: '2024-01-15T10:00:00Z', muscleGroups: ['Pecho'] },
      ]
      const result = generateCalendarDays(currentDate, sessions)

      const day15 = result.find(d => d?.day === 15)
      expect(day15.sessions).toHaveLength(1)
      expect(day15.muscleGroups).toContain('Pecho')
    })

    it('marca el día de hoy', () => {
      const currentDate = new Date('2024-01-15')
      const result = generateCalendarDays(currentDate, [])

      const day20 = result.find(d => d?.day === 20)
      expect(day20.isToday).toBe(true)

      const day15 = result.find(d => d?.day === 15)
      expect(day15.isToday).toBe(false)
    })

    it('incluye todos los días del mes', () => {
      const currentDate = new Date('2024-01-15')
      const result = generateCalendarDays(currentDate, [])

      const actualDays = result.filter(d => d !== null)
      expect(actualDays).toHaveLength(31) // Enero tiene 31 días
    })
  })

  describe('getMonthName', () => {
    it('retorna nombre del mes en español', () => {
      const date = new Date('2024-01-15')
      const result = getMonthName(date)
      expect(result.toLowerCase()).toContain('enero')
      expect(result).toContain('2024')
    })

    it('respeta locale personalizado', () => {
      const date = new Date('2024-01-15')
      const result = getMonthName(date, 'en-US')
      expect(result.toLowerCase()).toContain('january')
    })
  })

  describe('getPreviousMonth', () => {
    it('navega al mes anterior', () => {
      const date = new Date('2024-03-15')
      const result = getPreviousMonth(date)
      expect(result.getMonth()).toBe(1) // Febrero
      expect(result.getDate()).toBe(1)
    })

    it('cambia de año si es enero', () => {
      const date = new Date('2024-01-15')
      const result = getPreviousMonth(date)
      expect(result.getMonth()).toBe(11) // Diciembre
      expect(result.getFullYear()).toBe(2023)
    })
  })

  describe('getNextMonth', () => {
    it('navega al mes siguiente', () => {
      const date = new Date('2024-03-15')
      const result = getNextMonth(date)
      expect(result.getMonth()).toBe(3) // Abril
      expect(result.getDate()).toBe(1)
    })

    it('cambia de año si es diciembre', () => {
      const date = new Date('2024-12-15')
      const result = getNextMonth(date)
      expect(result.getMonth()).toBe(0) // Enero
      expect(result.getFullYear()).toBe(2025)
    })
  })
})
