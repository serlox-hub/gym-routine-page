/**
 * Compara los valores editados con los originales del session exercise
 * y devuelve solo los campos que cambiaron.
 *
 * @param {{ series: string, reps: string, rir: string, restSeconds: string, tempo: string, notes: string }} edited
 * @param {{ series: number, reps: string, rir: number|null, rest_seconds: number|null, tempo: string|null, notes: string|null }} original
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

  if (edited.tempo !== (original.tempo ?? '')) fields.tempo = edited.tempo || null
  if (edited.notes !== (original.notes ?? '')) fields.notes = edited.notes || null

  if (edited.supersetGroup !== undefined) {
    const editedSg = edited.supersetGroup === '' ? null : parseInt(edited.supersetGroup, 10)
    const originalSg = original.superset_group ?? null
    if (editedSg !== originalSg) fields.superset_group = editedSg
  }

  return { fields, newSeries: isNaN(newSeries) ? null : newSeries }
}
