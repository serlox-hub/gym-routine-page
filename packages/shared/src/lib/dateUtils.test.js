import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatFullDate,
  formatShortDate,
  formatTime,
  formatRelativeDate,
  getDaysDifference,
  getDateKey,
} from './dateUtils.js'

describe('dateUtils', () => {
  describe('formatFullDate', () => {
    it('formatea fecha en formato largo', () => {
      const result = formatFullDate('2024-01-15T10:00:00Z')
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })
  })

  describe('formatShortDate', () => {
    it('formatea fecha en formato corto', () => {
      const result = formatShortDate('2024-01-15T10:00:00Z')
      expect(result).toMatch(/15/)
    })
  })

  describe('formatTime', () => {
    it('formatea la hora correctamente', () => {
      const result = formatTime('2024-01-15T14:30:00Z', 'en-US')
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('formatRelativeDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('retorna "Hoy" para fecha de hoy', () => {
      expect(formatRelativeDate('2024-01-15T08:00:00Z')).toBe('Hoy')
    })

    it('retorna "Ayer" para fecha de ayer', () => {
      expect(formatRelativeDate('2024-01-14T08:00:00Z')).toBe('Ayer')
    })

    it('retorna "Hace X días" para menos de una semana', () => {
      expect(formatRelativeDate('2024-01-12T08:00:00Z')).toBe('Hace 3 días')
    })

    it('retorna "Hace X sem" para más de una semana', () => {
      expect(formatRelativeDate('2024-01-01T08:00:00Z')).toBe('Hace 2 sem')
    })

    it('retorna "Hace X mes" para más de un mes', () => {
      expect(formatRelativeDate('2023-12-01T08:00:00Z')).toBe('Hace 1 mes')
    })

    it('retorna "Hace X meses" para múltiples meses', () => {
      expect(formatRelativeDate('2023-10-15T08:00:00Z')).toBe('Hace 3 meses')
    })
  })

  describe('getDaysDifference', () => {
    it('calcula diferencia de 0 días para misma fecha', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      expect(getDaysDifference(date, date)).toBe(0)
    })

    it('calcula diferencia de días correctamente', () => {
      const date1 = new Date('2024-01-10T12:00:00Z')
      const date2 = new Date('2024-01-15T12:00:00Z')
      expect(getDaysDifference(date1, date2)).toBe(5)
    })

    it('acepta strings ISO', () => {
      expect(getDaysDifference('2024-01-10', '2024-01-15')).toBe(5)
    })
  })

  describe('getDateKey', () => {
    it('extrae la fecha sin hora', () => {
      expect(getDateKey('2024-01-15T14:30:00Z')).toBe('2024-01-15')
    })

    it('maneja fechas sin hora', () => {
      expect(getDateKey('2024-01-15')).toBe('2024-01-15')
    })
  })
})
