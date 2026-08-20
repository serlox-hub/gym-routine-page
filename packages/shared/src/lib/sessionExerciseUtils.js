import { resolveTrackedFields } from './measurementFields.js'
import { getSetColumns, buildSetFieldsPayload } from './setColumns.js'

/**
 * Compara los valores editados con los originales del session exercise
 * y devuelve solo los campos que cambiaron.
 *
 * @param {{ series: string, targetField: string, reps: string, level: string, rir: string, restSeconds: string, notes: string }} edited
 * @param {{ series: number, target_field: string|null, reps: string, level: number|null, rir: number|null, rest_seconds: number|null, notes: string|null }} original
 * @returns {{ fields: object, newSeries: number|null }}
 */
export function diffSessionExerciseFields(edited, original) {
  const fields = {}

  const newSeries = parseInt(edited.series, 10)
  if (!isNaN(newSeries) && newSeries !== original.series) fields.series = newSeries

  // `session_exercises.reps` es NOT NULL: nunca se envía vacío (el formulario lo
  // valida antes), así que un valor vacío se ignora en lugar de mandar null.
  if (edited.reps && edited.reps !== (original.reps ?? '')) fields.reps = edited.reps

  // El campo del que habla el objetivo. El formulario siempre lo resuelve (nunca vacío mientras
  // el ejercicio mida algo prescribible), así que un valor vacío es "este ejercicio no tiene
  // campo objetivo" y se manda como null.
  if (edited.targetField !== undefined) {
    const editedTargetField = edited.targetField === '' ? null : edited.targetField
    if (editedTargetField !== (original.target_field ?? null)) fields.target_field = editedTargetField
  }

  const newLevel = parseInt(edited.level, 10)
  if (edited.level === '' && original.level != null) fields.level = null
  else if (!isNaN(newLevel) && newLevel !== original.level) fields.level = newLevel

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
 * Genera los campos de una serie vacía según lo que mide el ejercicio: sus campos arrancan a 0 y
 * el resto ni se envían (el upsert no toca las columnas ausentes).
 * Usa las MISMAS columnas que pinta la fila (`getSetColumns`) — con la lista vieja
 * (peso/reps/tiempo/distancia) una serie añadida a un ejercicio de nivel o calorías nacía sin
 * inicializar sus propios campos.
 */
export function buildEmptySetData({ sessionId, sessionExerciseId, setNumber, exercise }) {
  const columns = getSetColumns(resolveTrackedFields(exercise))
  const zeros = Object.fromEntries(columns.map(({ field }) => [field, 0]))

  return {
    sessionId,
    sessionExerciseId,
    setNumber,
    ...buildSetFieldsPayload(zeros, columns),
    rirActual: null,
    notes: null,
    videoUrl: null,
  }
}
