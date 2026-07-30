import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatFullDate,
  formatShortDate,
  formatTime,
  formatRelativeDate,
  getDaysDifference,
  getDateKey,
  parseDateInput,
  resolveSessionEnd,
  formatDateTimeLocal,
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

    it('retorna "Ayer" para sesión de anoche vista esta mañana (< 24h, distinto día de calendario)', () => {
      // now = 2024-01-15T12:00:00Z; sesión ayer noche → 16h atrás pero día anterior
      expect(formatRelativeDate('2024-01-14T20:00:00Z')).toBe('Ayer')
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

  describe('parseDateInput', () => {
    it('devuelve la misma instancia si recibe un Date', () => {
      const d = new Date('2024-06-15T12:00:00Z')
      expect(parseDateInput(d)).toBe(d)
    })

    it('parsea YYYY-MM-DD como medianoche local (sin desplazamiento de zona horaria)', () => {
      const d = parseDateInput('2024-06-15')
      expect(d.getFullYear()).toBe(2024)
      expect(d.getMonth()).toBe(5)
      expect(d.getDate()).toBe(15)
      expect(d.getHours()).toBe(0)
    })

    it('parsea ISO timestamp con hora', () => {
      const d = parseDateInput('2024-06-15T14:30:00Z')
      expect(d.getFullYear()).toBe(2024)
      expect(d.getMonth()).toBe(5)
      expect(d.getDate()).toBe(15)
    })
  })

  describe('resolveSessionEnd', () => {
    const started = '2024-06-15T10:00:00Z'
    const now = '2024-06-16T20:00:00Z'

    it('acepta un fin válido en otro día y recalcula la duración', () => {
      const { completedAtISO, durationMinutes } = resolveSessionEnd('2024-06-16T11:30:00Z', started, now)
      expect(completedAtISO).toBe('2024-06-16T11:30:00.000Z')
      // 1 día y 1.5 h = 1530 min
      expect(durationMinutes).toBe(1530)
    })

    it('acota al inicio si el fin propuesto es anterior', () => {
      const { completedAtISO, durationMinutes } = resolveSessionEnd('2024-06-15T09:00:00Z', started, now)
      expect(completedAtISO).toBe('2024-06-15T10:00:00.000Z')
      expect(durationMinutes).toBe(0)
    })

    it('acota a "ahora" si el fin propuesto es futuro', () => {
      const { completedAtISO } = resolveSessionEnd('2024-06-18T10:00:00Z', started, now)
      expect(completedAtISO).toBe(now.replace('Z', '.000Z'))
    })

    it('devuelve el inicio si el fin propuesto no es una fecha válida', () => {
      const { completedAtISO, durationMinutes } = resolveSessionEnd('no-date', started, now)
      expect(completedAtISO).toBe('2024-06-15T10:00:00.000Z')
      expect(durationMinutes).toBe(0)
    })

    it('nunca deja el fin antes del inicio aunque "ahora" preceda al inicio (clock skew)', () => {
      const { completedAtISO } = resolveSessionEnd('2024-06-14T10:00:00Z', started, '2024-06-14T00:00:00Z')
      expect(completedAtISO).toBe('2024-06-15T10:00:00.000Z')
    })

    it('acepta instancias Date', () => {
      const { durationMinutes } = resolveSessionEnd(new Date('2024-06-15T11:00:00Z'), new Date(started), new Date(now))
      expect(durationMinutes).toBe(60)
    })
  })

  describe('formatDateTimeLocal', () => {
    it('formatea a YYYY-MM-DDTHH:mm en hora local', () => {
      const d = new Date(2024, 5, 15, 14, 5)
      expect(formatDateTimeLocal(d)).toBe('2024-06-15T14:05')
    })

    it('rellena con ceros mes, día, hora y minuto', () => {
      const d = new Date(2024, 0, 3, 9, 7)
      expect(formatDateTimeLocal(d)).toBe('2024-01-03T09:07')
    })

    it('devuelve cadena vacía para entrada inválida', () => {
      expect(formatDateTimeLocal('no-date')).toBe('')
      expect(formatDateTimeLocal('')).toBe('')
    })
  })
})
