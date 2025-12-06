import { describe, it, expect } from 'vitest'
import {
  formatSecondsToMMSS,
  formatRestTimeDisplay,
  calculateDurationMinutes,
  secondsToMinutes,
  minutesToSeconds,
  calculateTimerProgress,
  adjustTime,
} from './timeUtils.js'

describe('timeUtils', () => {
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
