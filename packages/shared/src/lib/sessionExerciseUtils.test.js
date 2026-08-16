import { describe, it, expect } from 'vitest'
import { diffSessionExerciseFields, buildEmptySetData, getSetFieldsForMeasurementType } from './sessionExerciseUtils.js'
import { MEASUREMENT_TYPES } from './measurementTypes.js'

describe('diffSessionExerciseFields', () => {
  const original = {
    series: 3,
    reps: '10',
    rir: 2,
    rest_seconds: 90,
    notes: 'Nota original',
  }

  it('devuelve objeto vacío si nada cambió', () => {
    const edited = { series: '3', reps: '10', rir: '2', restSeconds: '90', notes: 'Nota original' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(Object.keys(fields)).toHaveLength(0)
  })

  it('detecta cambio de series', () => {
    const edited = { series: '4', reps: '10', rir: '2', restSeconds: '90', notes: 'Nota original' }
    const { fields, newSeries } = diffSessionExerciseFields(edited, original)
    expect(fields.series).toBe(4)
    expect(newSeries).toBe(4)
  })

  it('detecta cambio de reps', () => {
    const edited = { series: '3', reps: '12', rir: '2', restSeconds: '90', notes: 'Nota original' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(fields.reps).toBe('12')
  })

  it('ignora el objetivo vacío en vez de mandar null (columna NOT NULL)', () => {
    const edited = { series: '3', reps: '', rir: '2', restSeconds: '90', notes: 'Nota original' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(fields).not.toHaveProperty('reps')
  })

  it('propaga el objetivo cuando el original venía sin valor', () => {
    const { fields } = diffSessionExerciseFields(
      { series: '3', reps: '30s', rir: '2', restSeconds: '90', notes: 'Nota original' },
      { ...original, reps: null },
    )
    expect(fields.reps).toBe('30s')
  })

  it('detecta cambio de rir', () => {
    const edited = { series: '3', reps: '10', rir: '1', restSeconds: '90', notes: 'Nota original' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(fields.rir).toBe(1)
  })

  it('pone rir a null si se vacía', () => {
    const edited = { series: '3', reps: '10', rir: '', restSeconds: '90', notes: 'Nota original' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(fields.rir).toBeNull()
  })

  it('detecta cambio de descanso', () => {
    const edited = { series: '3', reps: '10', rir: '2', restSeconds: '120', notes: 'Nota original' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(fields.rest_seconds).toBe(120)
  })

  it('pone rest_seconds a null si se vacía', () => {
    const edited = { series: '3', reps: '10', rir: '2', restSeconds: '', notes: 'Nota original' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(fields.rest_seconds).toBeNull()
  })

  it('detecta cambio de notas', () => {
    const edited = { series: '3', reps: '10', rir: '2', restSeconds: '90', notes: 'Nueva nota' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(fields.notes).toBe('Nueva nota')
  })

  it('maneja original con campos null', () => {
    const orig = { series: 3, reps: '10', rir: null, rest_seconds: null, notes: null }
    const edited = { series: '3', reps: '10', rir: '', restSeconds: '', notes: '' }
    const { fields } = diffSessionExerciseFields(edited, orig)
    expect(Object.keys(fields)).toHaveLength(0)
  })

  it('detecta múltiples cambios simultáneos', () => {
    const edited = { series: '5', reps: '8', rir: '0', restSeconds: '60', notes: 'Cambiado' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(fields.series).toBe(5)
    expect(fields.reps).toBe('8')
    expect(fields.rir).toBe(0)
    expect(fields.rest_seconds).toBe(60)
    expect(fields.notes).toBe('Cambiado')
  })

  it('detecta cambio de superset_group', () => {
    const orig = { ...original, superset_group: null }
    const edited = { series: '3', reps: '10', rir: '2', restSeconds: '90', notes: 'Nota original', supersetGroup: '1' }
    const { fields } = diffSessionExerciseFields(edited, orig)
    expect(fields.superset_group).toBe(1)
  })

  it('pone superset_group a null si se vacía', () => {
    const orig = { ...original, superset_group: 1 }
    const edited = { series: '3', reps: '10', rir: '2', restSeconds: '90', notes: 'Nota original', supersetGroup: '' }
    const { fields } = diffSessionExerciseFields(edited, orig)
    expect(fields.superset_group).toBeNull()
  })

  it('no incluye superset_group si no cambió', () => {
    const orig = { ...original, superset_group: 2 }
    const edited = { series: '3', reps: '10', rir: '2', restSeconds: '90', notes: 'Nota original', supersetGroup: '2' }
    const { fields } = diffSessionExerciseFields(edited, orig)
    expect(fields.superset_group).toBeUndefined()
  })

  it('ignora superset_group si no se pasa en edited', () => {
    const edited = { series: '3', reps: '10', rir: '2', restSeconds: '90', notes: 'Nota original' }
    const { fields } = diffSessionExerciseFields(edited, original)
    expect(fields.superset_group).toBeUndefined()
  })
})

describe('buildEmptySetData', () => {
  const base = { sessionId: 's1', sessionExerciseId: 'se1', setNumber: 1 }

  it('genera campos correctos para weight_reps', () => {
    const result = buildEmptySetData({ ...base, exercise: { measurement_type: 'weight_reps' } })
    expect(result.weight).toBe(0)
    expect(result.repsCompleted).toBe(0)
    expect(result.timeSeconds).toBeNull()
    expect(result.distanceMeters).toBeNull()
  })

  it('genera campos correctos para reps_only', () => {
    const result = buildEmptySetData({ ...base, exercise: { measurement_type: 'reps_only' } })
    expect(result.weight).toBeNull()
    expect(result.repsCompleted).toBe(0)
    expect(result.timeSeconds).toBeNull()
  })

  it('genera campos correctos para time', () => {
    const result = buildEmptySetData({ ...base, exercise: { measurement_type: 'time' } })
    expect(result.weight).toBeNull()
    expect(result.repsCompleted).toBeNull()
    expect(result.timeSeconds).toBe(0)
  })

  it('genera campos correctos para weight_time', () => {
    const result = buildEmptySetData({ ...base, exercise: { measurement_type: 'weight_time' } })
    expect(result.weight).toBe(0)
    expect(result.timeSeconds).toBe(0)
    expect(result.repsCompleted).toBeNull()
  })

  it('genera campos correctos para distance', () => {
    const result = buildEmptySetData({ ...base, exercise: { measurement_type: 'distance' } })
    expect(result.distanceMeters).toBe(0)
    expect(result.weight).toBeNull()
    expect(result.repsCompleted).toBeNull()
  })

  it('usa weight_reps por defecto si no hay measurement_type', () => {
    const result = buildEmptySetData({ ...base, exercise: {} })
    expect(result.weight).toBe(0)
    expect(result.repsCompleted).toBe(0)
  })
})

describe('getSetFieldsForMeasurementType', () => {
  // Tabla exhaustiva sobre los 12 tipos: congela la equivalencia con los
  // predicados de measurementTypes.js tras sustituir las listas literales.
  const EXPECTED = {
    weight_reps: { showWeight: true, showReps: true, showTime: false, showDistance: false },
    reps_only: { showWeight: false, showReps: true, showTime: false, showDistance: false },
    time: { showWeight: false, showReps: false, showTime: true, showDistance: false },
    weight_time: { showWeight: true, showReps: false, showTime: true, showDistance: false },
    distance: { showWeight: false, showReps: false, showTime: false, showDistance: true },
    weight_distance: { showWeight: true, showReps: false, showTime: false, showDistance: true },
    calories: { showWeight: false, showReps: false, showTime: false, showDistance: false },
    level_time: { showWeight: false, showReps: false, showTime: true, showDistance: false },
    level_distance: { showWeight: false, showReps: false, showTime: false, showDistance: true },
    level_calories: { showWeight: false, showReps: false, showTime: false, showDistance: false },
    distance_time: { showWeight: false, showReps: false, showTime: true, showDistance: true },
    distance_pace: { showWeight: false, showReps: false, showTime: false, showDistance: true },
  }

  it('cubre los 12 tipos de medición declarados', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...MEASUREMENT_TYPES].sort())
  })

  it.each(Object.entries(EXPECTED))('resuelve los campos de %s', (type, expected) => {
    expect(getSetFieldsForMeasurementType(type)).toEqual(expected)
  })

  it('cae a weight_reps sin tipo', () => {
    expect(getSetFieldsForMeasurementType(undefined)).toEqual(EXPECTED.weight_reps)
    expect(getSetFieldsForMeasurementType(null)).toEqual(EXPECTED.weight_reps)
  })
})
