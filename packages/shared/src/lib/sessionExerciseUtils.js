/**
 * Compara los valores editados con los originales del session exercise
 * y devuelve solo los campos que cambiaron.
 *
 * @param {{ series: string, reps: string, rir: string, restSeconds: string, notes: string }} edited
 * @param {{ series: number, reps: string, rir: number|null, rest_seconds: number|null, notes: string|null }} original
 * @returns {{ fields: object, newSeries: number|null }}
 */
export function diffSessionExerciseFields(edited, original) {
  const fields = {}

  const newSeries = parseInt(edited.series, 10)
  if (!isNaN(newSeries) && newSeries !== original.series) fields.series = newSeries

  if (edited.reps !== (original.reps ?? '')) fields.reps = edited.reps || null

  const newRir = parseInt(edited.rir, 10)
  if (edited.rir === '' && original.rir != null) fields.rir = null
  else if (!isNaN(newRir) && newRir !== original.rir) fields.rir = newRir

  const newRest = parseInt(edited.restSeconds, 10)
  if (!isNaN(newRest) && newRest !== original.rest_seconds) fields.rest_seconds = newRest
  else if (edited.restSeconds === '' && original.rest_seconds) fields.rest_seconds = null

  if (edited.notes !== (original.notes ?? '')) fields.notes = edited.notes || null

  if (edited.supersetGroup !== undefined) {
    const editedSg = edited.supersetGroup === '' ? null : parseInt(edited.supersetGroup, 10)
    const originalSg = original.superset_group ?? null
    if (editedSg !== originalSg) fields.superset_group = editedSg
  }

  return { fields, newSeries: isNaN(newSeries) ? null : newSeries }
}

/**
 * Devuelve qué campos de serie aplican según el tipo de medición.
 */
export function getSetFieldsForMeasurementType(measurementType) {
  const mt = measurementType || 'weight_reps'
  return {
    showWeight: ['weight_reps', 'weight_time', 'weight_distance'].includes(mt),
    showReps: ['weight_reps', 'reps_only'].includes(mt),
    showTime: ['time', 'weight_time', 'level_time', 'distance_time'].includes(mt),
    showDistance: ['distance', 'weight_distance', 'level_distance', 'distance_time', 'distance_pace'].includes(mt),
  }
}

/**
 * Genera los campos de una serie vacía según el tipo de medición del ejercicio.
 */
export function buildEmptySetData({ sessionId, sessionExerciseId, setNumber, exercise }) {
  const { showWeight: usesWeight, showReps: usesReps, showTime: usesTime, showDistance: usesDistance } = getSetFieldsForMeasurementType(exercise.measurement_type)

  return {
    sessionId,
    sessionExerciseId,
    setNumber,
    weight: usesWeight ? 0 : null,
    repsCompleted: usesReps ? 0 : null,
    timeSeconds: usesTime ? 0 : null,
    distanceMeters: usesDistance ? 0 : null,
    paceSeconds: null,
    rirActual: null,
    notes: null,
    videoUrl: null,
  }
}
