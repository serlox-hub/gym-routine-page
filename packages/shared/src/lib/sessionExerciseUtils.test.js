import { describe, it, expect } from 'vitest'
import { diffSessionExerciseFields, buildEmptySetData } from './sessionExerciseUtils.js'

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
  const build = (measurement_type) => buildEmptySetData({ ...base, exercise: { measurement_type } })

  it('arranca a 0 los campos del tipo y omite el resto (el upsert no los toca)', () => {
    expect(build('weight_reps')).toEqual({ ...base, weight: 0, repsCompleted: 0, rirActual: null, notes: null, videoUrl: null })
    expect(build('reps_only')).toEqual({ ...base, repsCompleted: 0, rirActual: null, notes: null, videoUrl: null })
    expect(build('time')).toEqual({ ...base, timeSeconds: 0, rirActual: null, notes: null, videoUrl: null })
    expect(build('weight_time')).toEqual({ ...base, weight: 0, timeSeconds: 0, rirActual: null, notes: null, videoUrl: null })
    expect(build('distance')).toEqual({ ...base, distanceMeters: 0, rirActual: null, notes: null, videoUrl: null })
  })

  it('cubre también nivel, calorías y ritmo (antes nacían sin inicializar)', () => {
    expect(build('level_time')).toEqual({ ...base, level: 0, timeSeconds: 0, rirActual: null, notes: null, videoUrl: null })
    expect(build('level_calories')).toEqual({ ...base, level: 0, caloriesBurned: 0, rirActual: null, notes: null, videoUrl: null })
    expect(build('distance_pace')).toEqual({ ...base, distanceMeters: 0, paceSeconds: 0, rirActual: null, notes: null, videoUrl: null })
  })

  it('usa weight_reps por defecto si no hay measurement_type', () => {
    expect(build(undefined)).toEqual({ ...base, weight: 0, repsCompleted: 0, rirActual: null, notes: null, videoUrl: null })
    expect(build(null)).toEqual({ ...base, weight: 0, repsCompleted: 0, rirActual: null, notes: null, videoUrl: null })
  })
})
