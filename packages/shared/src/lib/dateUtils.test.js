import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatFullDate,
  formatShortDate,
  toDateLocale,
  formatTime,
  formatRelativeDate,
  getDaysDifference,
  getDateKey,
  parseDateInput,
  resolveSessionEnd,
  resolveSessionStart,
  getSessionStartBounds,
  isSameTimestamp,
  formatDateTimeLocal,
  pickLatestTimestamp,
  getLastSetCompletedAt,
  shouldWarnIdleSession,
  isSameLocalDay,
  getLastSetEndChoice,
} from './dateUtils.js'
import { MAX_SESSION_DURATION_MINUTES, IDLE_SESSION_WARNING_MINUTES } from './constants.js'

describe('dateUtils', () => {
  describe('formatFullDate', () => {
    it('formatea fecha en formato largo', () => {
      const result = formatFullDate('2024-01-15T10:00:00Z')
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })
  })

  describe('toDateLocale', () => {
    it('traduce el idioma de la app al locale de fechas', () => {
      expect(toDateLocale('en')).toBe('en-US')
      expect(toDateLocale('es')).toBe('es-ES')
    })

    it('cae a español con un idioma desconocido o ausente', () => {
      expect(toDateLocale('fr')).toBe('es-ES')
      expect(toDateLocale(undefined)).toBe('es-ES')
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

    // duration_minutes es smallint: sin el tope, cerrar "ahora" una sesión olvidada semanas
    // atrás hacía morir el UPDATE por rango
    it('acota al tope de duración aunque "ahora" quede más lejos', () => {
      const farNow = new Date(new Date(started).getTime() + (MAX_SESSION_DURATION_MINUTES + 600) * 60000)
      const { durationMinutes } = resolveSessionEnd(farNow, started, farNow)
      expect(durationMinutes).toBe(MAX_SESSION_DURATION_MINUTES)
    })
  })

  describe('pickLatestTimestamp', () => {
    it('devuelve el más reciente como ISO', () => {
      expect(pickLatestTimestamp('2024-06-15T10:00:00Z', '2024-06-15T12:00:00+00:00', new Date('2024-06-15T11:00:00Z')))
        .toBe('2024-06-15T12:00:00.000Z')
    })

    it('ignora null, undefined, vacío e inválidos', () => {
      expect(pickLatestTimestamp(null, undefined, '', 'no-date', '2024-06-15T10:00:00Z')).toBe('2024-06-15T10:00:00.000Z')
    })

    it('devuelve null si ninguno es válido o no hay argumentos', () => {
      expect(pickLatestTimestamp(null, 'no-date')).toBeNull()
      expect(pickLatestTimestamp()).toBeNull()
    })
  })

  describe('getLastSetCompletedAt', () => {
    it('devuelve la hora de la serie más reciente', () => {
      const sets = {
        'a-1': { completedAt: '2024-06-15T10:00:00Z' },
        'a-2': { completedAt: '2024-06-15T10:05:00Z' },
        'b-1': { completedAt: '2024-06-15T10:02:00Z' },
      }
      expect(getLastSetCompletedAt(sets)).toBe('2024-06-15T10:05:00.000Z')
    })

    it('ignora series sin hora (restauradas del servidor)', () => {
      expect(getLastSetCompletedAt({ 'a-1': {}, 'a-2': { completedAt: '2024-06-15T10:00:00Z' } }))
        .toBe('2024-06-15T10:00:00.000Z')
    })

    it('devuelve null sin series o con null', () => {
      expect(getLastSetCompletedAt({})).toBeNull()
      expect(getLastSetCompletedAt(null)).toBeNull()
      expect(getLastSetCompletedAt({ 'a-1': {} })).toBeNull()
    })
  })

  describe('shouldWarnIdleSession', () => {
    const last = '2024-06-15T10:00:00Z'
    const minutesAfter = (m) => new Date(new Date(last).getTime() + m * 60000)

    it('avisa si han pasado más minutos que el umbral', () => {
      expect(shouldWarnIdleSession(last, minutesAfter(IDLE_SESSION_WARNING_MINUTES + 1))).toBe(true)
    })

    it('no avisa justo en el umbral ni por debajo', () => {
      expect(shouldWarnIdleSession(last, minutesAfter(IDLE_SESSION_WARNING_MINUTES))).toBe(false)
      expect(shouldWarnIdleSession(last, minutesAfter(5))).toBe(false)
    })

    it('respeta un umbral explícito', () => {
      expect(shouldWarnIdleSession(last, minutesAfter(11), 10)).toBe(true)
    })

    it('no avisa sin última serie o con fechas inválidas', () => {
      expect(shouldWarnIdleSession(null, minutesAfter(500))).toBe(false)
      expect(shouldWarnIdleSession('no-date', minutesAfter(500))).toBe(false)
      expect(shouldWarnIdleSession(last, 'no-date')).toBe(false)
    })
  })

  describe('isSameLocalDay', () => {
    it('compara por día de calendario local', () => {
      expect(isSameLocalDay(new Date(2024, 5, 15, 0, 5), new Date(2024, 5, 15, 23, 55))).toBe(true)
      expect(isSameLocalDay(new Date(2024, 5, 14, 23, 55), new Date(2024, 5, 15, 0, 5))).toBe(false)
    })

    it('devuelve false con entradas inválidas', () => {
      expect(isSameLocalDay(null, new Date())).toBe(false)
      expect(isSameLocalDay('no-date', new Date())).toBe(false)
    })
  })

  describe('getLastSetEndChoice', () => {
    it('solo la hora si la serie es de hoy', () => {
      const last = new Date(2024, 5, 15, 19, 42)
      const choice = getLastSetEndChoice(last, new Date(2024, 5, 15, 22, 0))
      expect(choice.key).toBe('workout:session.endAtLastSet')
      expect(choice.params.time).toBe(formatTime(last))
      expect(choice.params).not.toHaveProperty('date')
    })

    it('hora y fecha si la serie es de otro día', () => {
      const last = new Date(2024, 5, 14, 19, 42)
      const choice = getLastSetEndChoice(last, new Date(2024, 5, 15, 9, 0))
      expect(choice.key).toBe('workout:session.endAtLastSetOtherDay')
      expect(choice.params).toEqual({ time: formatTime(last), date: formatShortDate(last) })
    })
  })

  describe('isSameTimestamp', () => {
    it('compara por instante, no por cadena', () => {
      expect(isSameTimestamp('2024-06-15T10:00:00+00:00', '2024-06-15T10:00:00.000Z')).toBe(true)
      expect(isSameTimestamp('2024-06-15T10:00:00Z', new Date('2024-06-15T10:00:00Z'))).toBe(true)
    })

    it('es false con instantes distintos, nulos o inválidos', () => {
      expect(isSameTimestamp('2024-06-15T10:00:00Z', '2024-06-15T10:01:00Z')).toBe(false)
      expect(isSameTimestamp(null, '2024-06-15T10:00:00Z')).toBe(false)
      expect(isSameTimestamp('no-date', 'no-date')).toBe(false)
    })
  })

  describe('getSessionStartBounds', () => {
    const now = '2024-06-16T20:00:00Z'

    it('acota por el fin cuando la sesión lo tiene', () => {
      const { minDate, maxDate } = getSessionStartBounds(
        { startedAt: '2024-06-15T10:00:00Z', completedAt: '2024-06-15T11:00:00Z' },
        now
      )
      expect(maxDate.toISOString()).toBe('2024-06-15T11:00:00.000Z')
      expect(maxDate.getTime() - minDate.getTime()).toBe(MAX_SESSION_DURATION_MINUTES * 60000)
    })

    it('acota por "ahora" cuando no hay fin', () => {
      const { maxDate } = getSessionStartBounds(
        { startedAt: '2024-06-15T10:00:00Z', completedAt: null },
        now
      )
      expect(maxDate.toISOString()).toBe('2024-06-16T20:00:00.000Z')
    })

    it('un fin futuro no puede empujar la cota por encima de "ahora"', () => {
      const { maxDate } = getSessionStartBounds(
        { startedAt: '2024-06-15T10:00:00Z', completedAt: '2024-06-20T10:00:00Z' },
        now
      )
      expect(maxDate.toISOString()).toBe('2024-06-16T20:00:00.000Z')
    })

    it('un reloj atrasado no baja la cota por debajo del inicio actual (clock skew)', () => {
      const { maxDate } = getSessionStartBounds(
        { startedAt: '2024-06-15T10:00:00Z', completedAt: null },
        '2024-06-14T00:00:00Z'
      )
      expect(maxDate.toISOString()).toBe('2024-06-15T10:00:00.000Z')
    })
  })

  describe('resolveSessionStart', () => {
    const session = { startedAt: '2024-06-15T10:00:00Z', completedAt: '2024-06-15T11:30:00Z' }
    const now = '2024-06-16T20:00:00Z'

    it('acepta un inicio válido anterior y recalcula la duración como fin - inicio', () => {
      const { startedAtISO, durationMinutes } = resolveSessionStart('2024-06-14T18:00:00Z', session, now)
      expect(startedAtISO).toBe('2024-06-14T18:00:00.000Z')
      // 17h 30m
      expect(durationMinutes).toBe(1050)
    })

    it('acota al fin si el inicio propuesto es posterior', () => {
      const { startedAtISO, durationMinutes } = resolveSessionStart('2024-06-15T12:00:00Z', session, now)
      expect(startedAtISO).toBe('2024-06-15T11:30:00.000Z')
      expect(durationMinutes).toBe(0)
    })

    it('acota a "ahora" si no hay fin y el inicio propuesto es futuro', () => {
      const { startedAtISO, durationMinutes } = resolveSessionStart(
        '2024-06-18T10:00:00Z',
        { startedAt: '2024-06-15T10:00:00Z', completedAt: null },
        now
      )
      expect(startedAtISO).toBe('2024-06-16T20:00:00.000Z')
      expect(durationMinutes).toBeNull()
    })

    it('acota por la cota inferior: nunca más de MAX_SESSION_DURATION_MINUTES antes del fin', () => {
      const { startedAtISO, durationMinutes } = resolveSessionStart('2000-01-01T00:00:00Z', session, now)
      const expected = new Date(new Date(session.completedAt).getTime() - MAX_SESSION_DURATION_MINUTES * 60000)
      expect(startedAtISO).toBe(expected.toISOString())
      expect(durationMinutes).toBe(MAX_SESSION_DURATION_MINUTES)
    })

    it('entrada inválida o vacía es un no-op: devuelve el inicio actual y su duración', () => {
      for (const proposed of ['no-date', '', null, undefined]) {
        const { startedAtISO, durationMinutes } = resolveSessionStart(proposed, session, now)
        expect(startedAtISO).toBe('2024-06-15T10:00:00.000Z')
        expect(durationMinutes).toBe(90)
      }
    })

    it('sin fin, la duración es null (nunca now - inicio)', () => {
      const { startedAtISO, durationMinutes } = resolveSessionStart(
        '2024-06-14T10:00:00Z',
        { startedAt: '2024-06-15T10:00:00Z', completedAt: null },
        now
      )
      expect(startedAtISO).toBe('2024-06-14T10:00:00.000Z')
      expect(durationMinutes).toBeNull()
    })

    it('con un reloj atrasado, reproponer el inicio actual no lo mueve (clock skew)', () => {
      const noEnd = { startedAt: '2024-06-15T10:00:00Z', completedAt: null }
      const { startedAtISO } = resolveSessionStart(noEnd.startedAt, noEnd, '2024-06-14T00:00:00Z')
      expect(startedAtISO).toBe('2024-06-15T10:00:00.000Z')
    })

    it('devuelve null si el inicio actual no es una fecha válida', () => {
      const { startedAtISO, durationMinutes } = resolveSessionStart('2024-06-14T10:00:00Z', { startedAt: null, completedAt: null }, now)
      expect(startedAtISO).toBeNull()
      expect(durationMinutes).toBeNull()
    })

    it('acepta instancias Date', () => {
      const { startedAtISO } = resolveSessionStart(
        new Date('2024-06-15T09:00:00Z'),
        { startedAt: new Date(session.startedAt), completedAt: new Date(session.completedAt) },
        new Date(now)
      )
      expect(startedAtISO).toBe('2024-06-15T09:00:00.000Z')
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
