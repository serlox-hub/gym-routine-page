import { describe, it, expect } from 'vitest'
import {
  formatSecondsAsMMSS,
  formatSecondsToMMSS,
  formatElapsedSeconds,
  formatDuration,
  formatRestTimeDisplay,
  calculateDurationMinutes,
  secondsToMinutes,
  minutesToSeconds,
  calculateTimerProgress,
  adjustTime,
} from './timeUtils.js'

describe('timeUtils', () => {
  // Variante tolerante usada por el RITMO: el dato llega de BD, puede ser nulo y viene en segundos
  // que no tienen por qué ser enteros. Es su única diferencia con formatSecondsToMMSS.
  describe('formatSecondsAsMMSS', () => {
    it('sin valor devuelve cadena vacía', () => {
      expect(formatSecondsAsMMSS(null)).toBe('')
      expect(formatSecondsAsMMSS(undefined)).toBe('')
    })

    it('el 0 es un valor, no un vacío', () => {
      expect(formatSecondsAsMMSS(0)).toBe('0:00')
    })

    it('formatea un ritmo típico', () => {
      expect(formatSecondsAsMMSS(300)).toBe('5:00')
      expect(formatSecondsAsMMSS(330)).toBe('5:30')
    })

    it('redondea los decimales en vez de arrastrarlos al display', () => {
      expect(formatSecondsAsMMSS(300.6)).toBe('5:01')
      expect(formatSecondsAsMMSS(300.2)).toBe('5:00')
    })
  })

  describe('formatSecondsToMMSS', () => {
    it('formatea 0 segundos', () => {
      expect(formatSecondsToMMSS(0)).toBe('0:00')
    })

    it('formatea segundos menores a un minuto', () => {
      expect(formatSecondsToMMSS(45)).toBe('0:45')
    })

    it('formatea un minuto exacto', () => {
      expect(formatSecondsToMMSS(60)).toBe('1:00')
    })

    it('formatea minutos con segundos', () => {
      expect(formatSecondsToMMSS(90)).toBe('1:30')
    })

    it('formatea múltiples minutos', () => {
      expect(formatSecondsToMMSS(185)).toBe('3:05')
    })

    it('añade padding a segundos de un dígito', () => {
      expect(formatSecondsToMMSS(65)).toBe('1:05')
    })
  })

  describe('formatDuration', () => {
    it('por debajo del minuto usa segundos', () => {
      expect(formatDuration(45)).toBe('45s')
      expect(formatDuration(0)).toBe('0s')
    })

    it('a partir del minuto usa mm:ss + la pista de unidad (si no, "24:00" se lee como horas)', () => {
      expect(formatDuration(60)).toBe('1:00 min')
      expect(formatDuration(1440)).toBe('24:00 min')
    })

    it('con horas no lleva pista: los 3 segmentos ya se leen', () => {
      expect(formatDuration(3600)).toBe('1:00:00')
      expect(formatDuration(12240)).toBe('3:24:00')
    })

    it('valores raros: negativo, null, no numérico', () => {
      expect(formatDuration(-30)).toBe('0s')
      expect(formatDuration(null)).toBe('0s')
      expect(formatDuration('abc')).toBe('0s')
      expect(formatDuration(89.6)).toBe('1:30 min')
    })
  })

  describe('formatElapsedSeconds', () => {
    it('formatea 0 segundos como 0:00', () => {
      expect(formatElapsedSeconds(0)).toBe('0:00')
    })

    it('formatea menos de un minuto', () => {
      expect(formatElapsedSeconds(45)).toBe('0:45')
    })

    it('formatea minutos con padding de segundos', () => {
      expect(formatElapsedSeconds(125)).toBe('2:05')
    })

    it('añade el componente horas cuando supera 3600 segundos', () => {
      expect(formatElapsedSeconds(3661)).toBe('1:01:01')
    })

    it('formatea con padding de minutos cuando hay horas', () => {
      expect(formatElapsedSeconds(3605)).toBe('1:00:05')
    })

    it('protege contra valores negativos o nulos', () => {
      expect(formatElapsedSeconds(-30)).toBe('0:00')
      expect(formatElapsedSeconds(null)).toBe('0:00')
      expect(formatElapsedSeconds(undefined)).toBe('0:00')
    })
  })

  describe('formatRestTimeDisplay', () => {
    it('muestra segundos para valores menores a 60', () => {
      expect(formatRestTimeDisplay(45)).toBe('45s')
    })

    it('muestra minutos para valores exactos', () => {
      expect(formatRestTimeDisplay(60)).toBe('1min')
      expect(formatRestTimeDisplay(120)).toBe('2min')
    })

    it('muestra formato MM:SS para valores no exactos', () => {
      expect(formatRestTimeDisplay(90)).toBe('1:30')
    })
  })

  describe('calculateDurationMinutes', () => {
    it('calcula duración de 0 minutos', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T10:00:00Z')
      expect(calculateDurationMinutes(start, end)).toBe(0)
    })

    it('calcula duración de 30 minutos', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T10:30:00Z')
      expect(calculateDurationMinutes(start, end)).toBe(30)
    })

    it('redondea al minuto más cercano', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T10:30:29Z')
      expect(calculateDurationMinutes(start, end)).toBe(30)
    })

    it('acepta strings ISO', () => {
      expect(calculateDurationMinutes(
        '2024-01-15T10:00:00Z',
        '2024-01-15T11:00:00Z'
      )).toBe(60)
    })
  })

  describe('secondsToMinutes', () => {
    it('convierte 0 segundos', () => {
      expect(secondsToMinutes(0)).toBe(0)
    })

    it('convierte 60 segundos a 1 minuto', () => {
      expect(secondsToMinutes(60)).toBe(1)
    })

    it('trunca segundos parciales', () => {
      expect(secondsToMinutes(90)).toBe(1)
    })
  })

  describe('minutesToSeconds', () => {
    it('convierte 0 minutos', () => {
      expect(minutesToSeconds(0)).toBe(0)
    })

    it('convierte 1 minuto a 60 segundos', () => {
      expect(minutesToSeconds(1)).toBe(60)
    })

    it('convierte múltiples minutos', () => {
      expect(minutesToSeconds(5)).toBe(300)
    })
  })

  describe('calculateTimerProgress', () => {
    it('retorna 0 para tiempo inicial 0', () => {
      expect(calculateTimerProgress(0, 0)).toBe(0)
    })

    it('retorna 0 al inicio del timer', () => {
      expect(calculateTimerProgress(60, 60)).toBe(0)
    })

    it('retorna 50 a mitad del timer', () => {
      expect(calculateTimerProgress(60, 30)).toBe(50)
    })

    it('retorna 100 al final del timer', () => {
      expect(calculateTimerProgress(60, 0)).toBe(100)
    })

    it('calcula progreso correctamente', () => {
      expect(calculateTimerProgress(100, 25)).toBe(75)
    })
  })

  describe('adjustTime', () => {
    it('suma tiempo positivo', () => {
      expect(adjustTime(30, 15)).toBe(45)
    })

    it('resta tiempo negativo', () => {
      expect(adjustTime(30, -15)).toBe(15)
    })

    it('no permite valores negativos', () => {
      expect(adjustTime(10, -20)).toBe(0)
    })

    it('maneja tiempo 0', () => {
      expect(adjustTime(0, 30)).toBe(30)
    })
  })
})
