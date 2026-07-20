import { describe, it, expect } from 'vitest'
import { parseRepsRange, didSetHitTop, shouldSuggestProgression } from './progressionUtils.js'
import { MeasurementType } from './measurementTypes.js'
import { SET_TYPES } from './constants.js'

describe('parseRepsRange', () => {
  it('parsea un rango simple', () => {
    expect(parseRepsRange('8-12')).toEqual({ min: 8, max: 12 })
  })

  it('parsea un número único como rango degenerado', () => {
    expect(parseRepsRange('10')).toEqual({ min: 10, max: 10 })
  })

  it('normaliza rangos invertidos', () => {
    expect(parseRepsRange('12-8')).toEqual({ min: 8, max: 12 })
  })

  it('tolera espacios alrededor del guion', () => {
    expect(parseRepsRange('8 - 12')).toEqual({ min: 8, max: 12 })
  })

  it('acepta número (no string)', () => {
    expect(parseRepsRange(10)).toEqual({ min: 10, max: 10 })
  })

  it('devuelve null para rangos abiertos por arriba', () => {
    expect(parseRepsRange('8+')).toBeNull()
  })

  it('devuelve null para AMRAP', () => {
    expect(parseRepsRange('AMRAP')).toBeNull()
  })

  it('devuelve null para guion sin tope', () => {
    expect(parseRepsRange('8-')).toBeNull()
  })

  it('devuelve null para vacío/null', () => {
    expect(parseRepsRange('')).toBeNull()
    expect(parseRepsRange(null)).toBeNull()
    expect(parseRepsRange(undefined)).toBeNull()
  })
})

describe('didSetHitTop', () => {
  const wr = MeasurementType.WEIGHT_REPS

  it('true cuando las reps igualan el tope del rango', () => {
    expect(didSetHitTop({ weight: 10, reps: 12 }, '8-12', wr)).toBe(true)
  })

  it('true cuando las reps superan el tope', () => {
    expect(didSetHitTop({ weight: 10, reps: 15 }, '8-12', wr)).toBe(true)
  })

  it('false cuando las reps están dentro del rango', () => {
    expect(didSetHitTop({ weight: 10, reps: 10 }, '8-12', wr)).toBe(false)
  })

  it('false cuando las reps quedan por debajo del rango (nunca baja)', () => {
    expect(didSetHitTop({ weight: 10, reps: 7 }, '10-12', wr)).toBe(false)
  })

  it('false para dropsets', () => {
    expect(didSetHitTop({ weight: 10, reps: 20, setType: SET_TYPES.DROPSET }, '8-12', wr)).toBe(false)
  })

  it('false si falta peso o reps', () => {
    expect(didSetHitTop({ weight: null, reps: 12 }, '8-12', wr)).toBe(false)
    expect(didSetHitTop({ weight: 10, reps: null }, '8-12', wr)).toBe(false)
  })

  it('false sin serie previa', () => {
    expect(didSetHitTop(null, '8-12', wr)).toBe(false)
    expect(didSetHitTop(undefined, '8-12', wr)).toBe(false)
  })

  it('false para rango no parseable', () => {
    expect(didSetHitTop({ weight: 10, reps: 20 }, 'AMRAP', wr)).toBe(false)
  })

  it('false para tipos distintos de weight_reps', () => {
    expect(didSetHitTop({ weight: 10, reps: 12 }, '8-12', MeasurementType.REPS_ONLY)).toBe(false)
  })

  it('rango degenerado (número único): true si iguala el objetivo', () => {
    expect(didSetHitTop({ weight: 80, reps: 10 }, '10', wr)).toBe(true)
  })
})

describe('shouldSuggestProgression', () => {
  const wr = MeasurementType.WEIGHT_REPS
  const hitTop = { weight: 80, reps: 12 } // llegó al tope de 8-12

  it('false cuando la serie no llegó al tope (aunque no haya peso tecleado)', () => {
    expect(shouldSuggestProgression({ previousSet: { weight: 80, reps: 10 }, repsTarget: '8-12', measurementType: wr, currentWeight: '' })).toBe(false)
  })

  it('true si llegó al tope y aún no hay peso tecleado (vacío → NaN)', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, repsTarget: '8-12', measurementType: wr, currentWeight: '' })).toBe(true)
    expect(shouldSuggestProgression({ previousSet: hitTop, repsTarget: '8-12', measurementType: wr, currentWeight: null })).toBe(true)
  })

  it('true si el peso tecleado iguala al anterior (aún no ha subido)', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, repsTarget: '8-12', measurementType: wr, currentWeight: '80' })).toBe(true)
  })

  it('true si el peso tecleado es menor que el anterior', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, repsTarget: '8-12', measurementType: wr, currentWeight: '75' })).toBe(true)
  })

  it('false una vez tecleas un peso mayor que el anterior (nudge cumplido)', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, repsTarget: '8-12', measurementType: wr, currentWeight: '82.5' })).toBe(false)
  })

  it('reconoce el peso mayor con coma decimal (parseDecimal)', () => {
    expect(shouldSuggestProgression({ previousSet: hitTop, repsTarget: '8-12', measurementType: wr, currentWeight: '82,5' })).toBe(false)
  })
})
