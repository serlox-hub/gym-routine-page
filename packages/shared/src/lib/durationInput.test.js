import { describe, it, expect } from 'vitest'
import {
  sanitizeDurationDigits,
  clampDurationDigits,
  durationDigitsToSeconds,
  secondsToDurationDigits,
  formatDurationDigits,
} from './durationInput.js'

describe('sanitizeDurationDigits', () => {
  it('deja solo dígitos', () => {
    expect(sanitizeDurationDigits('20:00')).toBe('2000')
    expect(sanitizeDurationDigits('1a2b')).toBe('12')
  })

  it('quita ceros a la izquierda pero conserva el 0 solo', () => {
    expect(sanitizeDurationDigits('0045')).toBe('45')
    expect(sanitizeDurationDigits('0')).toBe('0')
    expect(sanitizeDurationDigits('000')).toBe('0')
  })

  it('NO limita la longitud: debe poder leer un valor ya guardado de 10 h o más', () => {
    expect(sanitizeDurationDigits('1234567')).toBe('1234567')
  })

  it('vacío/null → cadena vacía', () => {
    expect(sanitizeDurationDigits('')).toBe('')
    expect(sanitizeDurationDigits(null)).toBe('')
    expect(sanitizeDurationDigits(undefined)).toBe('')
  })
})

describe('clampDurationDigits', () => {
  it('acota el TECLEO a 5 dígitos (9:59:59)', () => {
    expect(clampDurationDigits('1234567')).toBe('12345')
    expect(clampDurationDigits('20:00')).toBe('2000')
  })

  it('el "0" suelto se vacía: si no, el Backspace no puede borrar el campo', () => {
    expect(clampDurationDigits('0:0')).toBe('')
    expect(clampDurationDigits('0')).toBe('')
    expect(clampDurationDigits('')).toBe('')
  })

  it('pero un 0 ya guardado se sigue LEYENDO como 0:00', () => {
    expect(formatDurationDigits(secondsToDurationDigits(0))).toBe('0:00')
  })
})

describe('durationDigitsToSeconds', () => {
  it('rellena desde la derecha', () => {
    expect(durationDigitsToSeconds('3')).toBe(3)
    expect(durationDigitsToSeconds('30')).toBe(30)
    expect(durationDigitsToSeconds('130')).toBe(90)
    expect(durationDigitsToSeconds('2000')).toBe(1200)
  })

  it('a partir de 5 dígitos entran las horas (mismo desglose que formatDuration)', () => {
    expect(durationDigitsToSeconds('10000')).toBe(3600)
    expect(durationDigitsToSeconds('32400')).toBe(12240)
  })

  it('admite ss > 59 mientras se teclea', () => {
    expect(durationDigitsToSeconds('75')).toBe(75)
  })

  it('vacío → "" (campo vacío, no 0)', () => {
    expect(durationDigitsToSeconds('')).toBe('')
    expect(durationDigitsToSeconds(null)).toBe('')
  })

  it('0 es un valor, no vacío', () => {
    expect(durationDigitsToSeconds('0')).toBe(0)
  })
})

describe('secondsToDurationDigits', () => {
  it('normaliza a mm:ss', () => {
    expect(secondsToDurationDigits(1200)).toBe('2000')
    expect(secondsToDurationDigits(90)).toBe('130')
    expect(secondsToDurationDigits(75)).toBe('115')
    expect(secondsToDurationDigits(45)).toBe('45')
    expect(secondsToDurationDigits(0)).toBe('0')
    expect(secondsToDurationDigits(12240)).toBe('32400')
  })

  it('un valor de 10 h o más se lee entero (no se trunca a 5 dígitos)', () => {
    expect(secondsToDurationDigits(36000)).toBe('100000')
    expect(formatDurationDigits('100000')).toBe('10:00:00')
    expect(durationDigitsToSeconds('100000')).toBe(36000)
  })

  it('es la inversa de durationDigitsToSeconds', () => {
    for (const seconds of [0, 5, 45, 60, 90, 1200, 3600, 3661, 12240, 36000]) {
      expect(durationDigitsToSeconds(secondsToDurationDigits(seconds))).toBe(seconds)
    }
  })

  it('vacío/null/NaN → cadena vacía', () => {
    expect(secondsToDurationDigits('')).toBe('')
    expect(secondsToDurationDigits(null)).toBe('')
    expect(secondsToDurationDigits(undefined)).toBe('')
    expect(secondsToDurationDigits('abc')).toBe('')
  })
})

describe('formatDurationDigits', () => {
  it('formatea lo tecleado', () => {
    expect(formatDurationDigits('5')).toBe('0:05')
    expect(formatDurationDigits('30')).toBe('0:30')
    expect(formatDurationDigits('130')).toBe('1:30')
    expect(formatDurationDigits('2000')).toBe('20:00')
    expect(formatDurationDigits('32400')).toBe('3:24:00')
  })

  it('sin dígitos devuelve vacío (el input enseña su placeholder)', () => {
    expect(formatDurationDigits('')).toBe('')
    expect(formatDurationDigits(null)).toBe('')
  })
})
