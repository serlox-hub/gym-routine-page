import { describe, it, expect } from 'vitest'
import {
  effortRendersAsWord,
  formatEffortBadge,
  getEffortInfo,
  getEffortLabel,
  getEffortOptions,
  isValidEffortValue,
  metEffortTarget,
} from './effortScale.js'

const WEIGHT_REPS = ['weight', 'reps']
const REPS_ONLY = ['reps']
const TIME = ['time']
const BIKE = ['level', 'distance', 'time']

describe('getEffortLabel', () => {
  it('es RIR si el ejercicio mide reps y "Esfuerzo" si no', () => {
    expect(getEffortLabel(WEIGHT_REPS)).toBe('RIR')
    expect(getEffortLabel(REPS_ONLY)).toBe('RIR')
    expect(getEffortLabel(TIME)).toBe('Esfuerzo')
    expect(getEffortLabel(['weight', 'distance'])).toBe('Esfuerzo')
    expect(getEffortLabel(BIKE)).toBe('Esfuerzo')
  })
})

describe('getEffortOptions', () => {
  it('devuelve la escala RIR (F/0/1/2/3+) con reps', () => {
    const opts = getEffortOptions(WEIGHT_REPS)
    expect(opts.map(o => o.value)).toEqual([-1, 0, 1, 2, 3])
    expect(opts.map(o => o.label)).toEqual(['F', '0', '1', '2', '3+'])
    expect(getEffortOptions(REPS_ONLY)).toBe(opts)
  })

  it('devuelve la escala RPE (1-5) sin reps', () => {
    const opts = getEffortOptions(BIKE)
    expect(opts.map(o => o.value)).toEqual([1, 2, 3, 4, 5])
    opts.forEach(o => expect(o.label).toBeTruthy())
  })

  it('sin campos cae al default (peso × reps) → RIR, no RPE', () => {
    expect(getEffortOptions(null).map(o => o.value)).toEqual([-1, 0, 1, 2, 3])
  })
})

describe('isValidEffortValue', () => {
  it('acepta toda la escala RIR, incluido F = -1', () => {
    for (const value of [-1, 0, 1, 2, 3]) {
      expect(isValidEffortValue(value, WEIGHT_REPS), `RIR ${value}`).toBe(true)
    }
  })

  it('rechaza en RIR los valores que solo existen en RPE', () => {
    expect(isValidEffortValue(4, WEIGHT_REPS)).toBe(false)
    expect(isValidEffortValue(5, WEIGHT_REPS)).toBe(false)
  })

  it('acepta la escala RPE (1-5) en ejercicios sin reps', () => {
    for (const value of [1, 2, 3, 4, 5]) {
      expect(isValidEffortValue(value, BIKE), `RPE ${value}`).toBe(true)
    }
  })

  it('rechaza en RPE los valores que solo existen en RIR', () => {
    expect(isValidEffortValue(-1, BIKE)).toBe(false)
    expect(isValidEffortValue(0, BIKE)).toBe(false)
  })

  it('rechaza NaN y valores fuera de cualquier escala', () => {
    expect(isValidEffortValue(NaN, WEIGHT_REPS)).toBe(false)
    expect(isValidEffortValue(99, BIKE)).toBe(false)
  })
})

describe('getEffortInfo', () => {
  it('devuelve null sin valor', () => {
    expect(getEffortInfo(null, WEIGHT_REPS)).toBeNull()
    expect(getEffortInfo(undefined, WEIGHT_REPS)).toBeNull()
  })

  it('el mismo número significa cosas distintas en cada escala', () => {
    expect(getEffortInfo(0, WEIGHT_REPS).label).toBe('0')
    expect(getEffortInfo(3, REPS_ONLY).label).toBe('3+')
    expect(getEffortInfo(-1, WEIGHT_REPS).label).toBe('F')
    expect(getEffortInfo(1, WEIGHT_REPS).label).not.toBe(getEffortInfo(1, TIME).label)
  })
})

describe('formatEffortBadge', () => {
  it('devuelve cadena vacía sin valor', () => {
    expect(formatEffortBadge(null, WEIGHT_REPS)).toBe('')
    expect(formatEffortBadge(undefined, TIME)).toBe('')
  })

  it('prefija con "@" la etiqueta RIR', () => {
    expect(formatEffortBadge(0, WEIGHT_REPS)).toBe('@0')
    expect(formatEffortBadge(3, REPS_ONLY)).toBe('@3+')
    expect(formatEffortBadge(-1, WEIGHT_REPS)).toBe('@F')
  })

  it('en RPE devuelve la PALABRA, no el índice interno', () => {
    expect(formatEffortBadge(1, BIKE)).toBe('Fácil')
    expect(formatEffortBadge(4, BIKE)).toBe('Muy duro')
    expect(formatEffortBadge(5, BIKE)).toBe('Máximo')
  })

  it('sin campos cae en la escala RIR, no en RPE', () => {
    expect(formatEffortBadge(2)).toBe('@2')
    expect(formatEffortBadge(2, null)).toBe('@2')
  })

  it('cae al número crudo si el valor está fuera de la escala (datos legados)', () => {
    expect(formatEffortBadge(0, BIKE)).toBe('0')
    expect(formatEffortBadge(-1, BIKE)).toBe('-1')
  })
})

describe('effortRendersAsWord', () => {
  it('solo en RPE y con la escala visible (decide el ancho de la columna «Notas»)', () => {
    expect(effortRendersAsWord(BIKE, true)).toBe(true)
    expect(effortRendersAsWord(BIKE, false)).toBe(false)
    expect(effortRendersAsWord(WEIGHT_REPS, true)).toBe(false)
    // Sin campos cae al default (peso × reps) → RIR compacto
    expect(effortRendersAsWord(null, true)).toBe(false)
  })
})

// Gate de autorregulación de la progresión. La comparación se invierte entre escalas: en RIR el
// número son reps EN RESERVA (más alto = más fácil) y en RPE es esfuerzo PERCIBIDO (más alto = más
// duro). Ver metEffortTarget.
describe('metEffortTarget', () => {
  it('true si no hay objetivo (rutina sin esfuerzo) → gate inactivo', () => {
    expect(metEffortTarget(0, null, WEIGHT_REPS)).toBe(true)
    expect(metEffortTarget(0, undefined, WEIGHT_REPS)).toBe(true)
  })

  it('true si no se registró el esfuerzo real → gate inactivo', () => {
    expect(metEffortTarget(null, 2, WEIGHT_REPS)).toBe(true)
    expect(metEffortTarget(undefined, 2, WEIGHT_REPS)).toBe(true)
  })

  it('RIR: cumple si la reserva real iguala o supera la pedida', () => {
    expect(metEffortTarget(2, 2, WEIGHT_REPS)).toBe(true)
    expect(metEffortTarget(3, 2, WEIGHT_REPS)).toBe(true)
    expect(metEffortTarget(1, 2, WEIGHT_REPS)).toBe(false)
    expect(metEffortTarget(0, 2, WEIGHT_REPS)).toBe(false)
  })

  it('RIR objetivo 0 (al fallo): cualquier reserva real ≥ 0 pasa', () => {
    expect(metEffortTarget(0, 0, WEIGHT_REPS)).toBe(true)
    expect(metEffortTarget(3, 0, WEIGHT_REPS)).toBe(true)
  })

  it('RPE: cumple si el esfuerzo real no fue más duro que el prescrito', () => {
    expect(metEffortTarget(3, 3, BIKE)).toBe(true)
    expect(metEffortTarget(2, 3, BIKE)).toBe(true)
    expect(metEffortTarget(4, 3, BIKE)).toBe(false)
    expect(metEffortTarget(5, 3, BIKE)).toBe(false)
  })
})
