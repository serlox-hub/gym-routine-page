import { describe, it, expect } from 'vitest'
import { parseExerciseConfigForm } from './routineExerciseForm.js'

describe('parseExerciseConfigForm', () => {
  const fullForm = {
    series: '4',
    reps: '10-12',
    rir: '2',
    rest_seconds: '90',
    notes: 'Controlar excéntrica',
    tempo: '3-1-1-0',
    tempo_razon: 'Hipertrofia',
    superset_group: '1',
  }

  it('parsea todos los campos correctamente', () => {
    const result = parseExerciseConfigForm(fullForm)
    expect(result).toEqual({
      series: 4,
      reps: '10-12',
      rir: 2,
      rest_seconds: 90,
      notes: 'Controlar excéntrica',
      tempo: '3-1-1-0',
      tempo_razon: 'Hipertrofia',
      superset_group: 1,
    })
  })

  it('usa defaults para campos vacíos', () => {
    const emptyForm = {
      series: '',
      reps: '',
      rir: '',
      rest_seconds: '',
      notes: '',
      tempo: '',
      tempo_razon: '',
      superset_group: '',
    }
    const result = parseExerciseConfigForm(emptyForm)
    expect(result).toEqual({
      series: 3,
      reps: '8-12',
      rir: null,
      rest_seconds: null,
      notes: null,
      tempo: null,
      tempo_razon: null,
      superset_group: null,
    })
  })

  it('permite override de defaultReps', () => {
    const form = { series: '3', reps: '', rir: '', rest_seconds: '', notes: '', tempo: '', tempo_razon: '', superset_group: '' }
    const result = parseExerciseConfigForm(form, { defaultReps: '30:00' })
    expect(result.reps).toBe('30:00')
  })

  it('conserva reps cuando tiene valor', () => {
    const form = { ...fullForm, reps: '5' }
    const result = parseExerciseConfigForm(form, { defaultReps: '30:00' })
    expect(result.reps).toBe('5')
  })

  it('parsea series inválido a default 3', () => {
    const form = { ...fullForm, series: 'abc' }
    expect(parseExerciseConfigForm(form).series).toBe(3)
  })

  it('maneja rir como 0 correctamente', () => {
    const form = { ...fullForm, rir: '0' }
    expect(parseExerciseConfigForm(form).rir).toBe(0)
  })
})
