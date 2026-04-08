import { describe, it, expect, beforeAll } from 'vitest'
import { initI18n } from '../i18n/index.js'
import { getExerciseName, resolveWeightUnit, getExerciseInstructions, getStructuredInstructions, getMuscleGroupName, getEquipmentName, localizeExercise, localizeExercisesInList } from './exerciseUtils.js'

beforeAll(() => { initI18n() })

describe('getExerciseName', () => {
  it('devuelve name_es por defecto (locale es)', () => {
    const exercise = { name: 'Press de banca', name_en: 'Bench Press' }
    expect(getExerciseName(exercise)).toBe('Press de banca')
  })

  it('devuelve name si name_en no existe', () => {
    const exercise = { name: 'Mi ejercicio custom' }
    expect(getExerciseName(exercise)).toBe('Mi ejercicio custom')
  })

  it('devuelve name_es si existe', () => {
    const exercise = { name_es: 'Press de banca', name_en: 'Bench Press' }
    expect(getExerciseName(exercise)).toBe('Press de banca')
  })

  it('devuelve string vacío para null/undefined', () => {
    expect(getExerciseName(null)).toBe('')
    expect(getExerciseName(undefined)).toBe('')
  })

  it('devuelve string vacío si no tiene ningún campo de nombre', () => {
    expect(getExerciseName({})).toBe('')
  })
})

describe('resolveWeightUnit', () => {
  it('usa exercise.weight_unit si está definido', () => {
    expect(resolveWeightUnit({ weight_unit: 'lb' }, { weight_unit: 'kg' })).toBe('lb')
  })

  it('cae a preferencia del usuario si exercise no tiene override', () => {
    expect(resolveWeightUnit({ weight_unit: null }, { weight_unit: 'lb' })).toBe('lb')
    expect(resolveWeightUnit({}, { weight_unit: 'lb' })).toBe('lb')
  })

  it('cae a kg por defecto si no hay override ni preferencia', () => {
    expect(resolveWeightUnit({}, {})).toBe('kg')
    expect(resolveWeightUnit(null, null)).toBe('kg')
    expect(resolveWeightUnit(undefined, undefined)).toBe('kg')
  })
})

describe('getExerciseInstructions', () => {
  it('devuelve string vacío para null/undefined', () => {
    expect(getExerciseInstructions(null)).toBe('')
    expect(getExerciseInstructions(undefined)).toBe('')
    expect(getExerciseInstructions({})).toBe('')
  })

  it('devuelve string directo para instrucciones legacy (TEXT)', () => {
    const exercise = { instructions: 'Codos pegados al cuerpo' }
    expect(getExerciseInstructions(exercise)).toBe('Codos pegados al cuerpo')
  })

  it('devuelve texto formateado para instrucciones JSONB (locale es)', () => {
    const exercise = {
      instructions: {
        es: { setup: 'Banco plano.', execution: 'Empuja hacia arriba.', cues: ['Codos a 45°', 'Escápulas juntas'], mistakes: [] },
        en: { setup: 'Flat bench.', execution: 'Push up.', cues: ['Elbows at 45°'], mistakes: [] },
      },
    }
    const result = getExerciseInstructions(exercise)
    expect(result).toContain('Banco plano.')
    expect(result).toContain('Empuja hacia arriba.')
    expect(result).toContain('Codos a 45°')
  })

  it('maneja JSONB sin cues', () => {
    const exercise = {
      instructions: { es: { setup: 'Posición inicial.', execution: 'Mover.', cues: [], mistakes: [] } },
    }
    expect(getExerciseInstructions(exercise)).toBe('Posición inicial.\nMover.')
  })
})

describe('getStructuredInstructions', () => {
  it('devuelve null para instrucciones legacy o vacías', () => {
    expect(getStructuredInstructions(null)).toBeNull()
    expect(getStructuredInstructions({ instructions: 'texto' })).toBeNull()
    expect(getStructuredInstructions({})).toBeNull()
  })

  it('devuelve estructura es para locale español', () => {
    const exercise = {
      instructions: {
        es: { setup: 'A', execution: 'B', cues: ['C'], mistakes: ['D'] },
        en: { setup: 'E', execution: 'F', cues: ['G'], mistakes: ['H'] },
      },
    }
    const result = getStructuredInstructions(exercise)
    expect(result.setup).toBe('A')
    expect(result.cues).toEqual(['C'])
  })
})

describe('getMuscleGroupName', () => {
  it('devuelve name (alias de name_es) por defecto', () => {
    expect(getMuscleGroupName({ name: 'Pecho', name_en: 'Chest' })).toBe('Pecho')
  })

  it('devuelve string vacío para null/undefined', () => {
    expect(getMuscleGroupName(null)).toBe('')
    expect(getMuscleGroupName(undefined)).toBe('')
  })

  it('usa name_es como fallback', () => {
    expect(getMuscleGroupName({ name_es: 'Espalda' })).toBe('Espalda')
  })
})

describe('getEquipmentName', () => {
  it('devuelve name (alias de name_es) por defecto', () => {
    expect(getEquipmentName({ name: 'Barra', name_en: 'Barbell' })).toBe('Barra')
  })

  it('devuelve string vacío para null/undefined', () => {
    expect(getEquipmentName(null)).toBe('')
    expect(getEquipmentName(undefined)).toBe('')
  })
})

describe('localizeExercise', () => {
  it('resuelve name al locale actual (es por defecto)', () => {
    const ex = { name: 'Press de banca', name_en: 'Bench Press' }
    const result = localizeExercise(ex)
    expect(result.name).toBe('Press de banca')
    expect(result.name_en).toBe('Bench Press')
  })

  it('no modifica ejercicios sin name_en', () => {
    const ex = { name: 'Custom', id: 1 }
    expect(localizeExercise(ex)).toBe(ex)
  })

  it('devuelve null/undefined sin error', () => {
    expect(localizeExercise(null)).toBe(null)
    expect(localizeExercise(undefined)).toBe(undefined)
  })
})

describe('localizeExercisesInList', () => {
  it('localiza ejercicios de nivel superior', () => {
    const items = [{ name: 'Press', name_en: 'Bench Press' }]
    const result = localizeExercisesInList(items)
    expect(result[0].name).toBe('Press')
  })

  it('localiza exercises anidados en .exercise', () => {
    const items = [{ id: 1, exercise: { name: 'Press', name_en: 'Bench Press' } }]
    const result = localizeExercisesInList(items)
    expect(result[0].exercise.name).toBe('Press')
  })

  it('localiza session_exercises[].exercise', () => {
    const items = [{
      id: 's1',
      session_exercises: [{ id: 'se1', exercise: { name: 'Curl', name_en: 'Curl' } }]
    }]
    const result = localizeExercisesInList(items)
    expect(result[0].session_exercises[0].exercise.name).toBe('Curl')
  })

  it('localiza routine_exercises[].exercise', () => {
    const items = [{
      id: 'b1',
      routine_exercises: [{ id: 're1', exercise: { name: 'Sentadilla', name_en: 'Squat' } }]
    }]
    const result = localizeExercisesInList(items)
    expect(result[0].routine_exercises[0].exercise.name).toBe('Sentadilla')
  })

  it('devuelve null/undefined sin error', () => {
    expect(localizeExercisesInList(null)).toBe(null)
    expect(localizeExercisesInList(undefined)).toBe(undefined)
  })

  it('no modifica items sin exercises', () => {
    const items = [{ id: 1, other: 'data' }]
    const result = localizeExercisesInList(items)
    expect(result[0]).toBe(items[0])
  })
})
