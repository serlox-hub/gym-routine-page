import { describe, it, expect } from 'vitest'
import { buildExerciseOverrideForm } from './exerciseOverrideForm.js'

const RUN = { id: 7, distance_unit: 'km', tracked_fields: ['distance', 'time'] }

describe('buildExerciseOverrideForm', () => {
  it('sin elección propia, la unidad efectiva es la del catálogo y no se guarda override', () => {
    const { effectiveDistanceUnit, payload } = buildExerciseOverrideForm({
      exercise: RUN, exerciseId: 7, notes: 'ojo con la rodilla', distanceUnit: null,
    })
    expect(effectiveDistanceUnit).toBe('km')
    expect(payload).toEqual({ exerciseId: 7, notes: 'ojo con la rodilla', distanceUnit: null })
  })

  it('elegir una unidad distinta de la del catálogo sí guarda override', () => {
    const { effectiveDistanceUnit, payload } = buildExerciseOverrideForm({
      exercise: RUN, exerciseId: 7, notes: '', distanceUnit: 'm',
    })
    expect(effectiveDistanceUnit).toBe('m')
    expect(payload.distanceUnit).toBe('m')
  })

  it('volver a elegir la del catálogo borra el override (null), no lo congela', () => {
    const { payload } = buildExerciseOverrideForm({
      exercise: RUN, exerciseId: 7, notes: '', distanceUnit: 'km',
    })
    expect(payload.distanceUnit).toBeNull()
  })

  // La trampa que motivó extraer esto: sin el ejercicio no se sabe la unidad del catálogo, y
  // mandar la clave borraría el override del usuario al guardar solo las notas.
  it('mientras el ejercicio no ha cargado, la clave distanceUnit NO viaja', () => {
    const { payload, showDistanceUnit } = buildExerciseOverrideForm({
      exercise: null, exerciseId: 7, notes: 'nota', distanceUnit: 'm',
    })
    expect('distanceUnit' in payload).toBe(false)
    expect(payload).toEqual({ exerciseId: 7, notes: 'nota' })
    expect(showDistanceUnit).toBe(false)
  })

  it('el selector solo se ofrece si el ejercicio mide distancia', () => {
    expect(buildExerciseOverrideForm({ exercise: RUN, exerciseId: 7 }).showDistanceUnit).toBe(true)
    expect(buildExerciseOverrideForm({
      exercise: { id: 1, tracked_fields: ['weight', 'reps'] }, exerciseId: 1,
    }).showDistanceUnit).toBe(false)
  })

  it('un ejercicio sin unidad en el catálogo cae en metros', () => {
    const { effectiveDistanceUnit, payload } = buildExerciseOverrideForm({
      exercise: { id: 9, tracked_fields: ['distance'] }, exerciseId: 9, distanceUnit: null,
    })
    expect(effectiveDistanceUnit).toBe('m')
    expect(payload.distanceUnit).toBeNull()
  })
})
