import { t } from '../i18n/index.js'
import {
  getDefaultReps,
  getRepsLabel,
  isValidEffortValue,
} from './measurementTypes.js'

const DEFAULT_SERIES = 3

/**
 * Estado inicial del formulario de configuración de un ejercicio en rutina.
 * El objetivo (`reps`) se prellena según el tipo de medición: para `level_time`
 * es "30s", no "8-12".
 * @param {string} [measurementType]
 * @returns {object}
 */
export function buildExerciseConfigForm(measurementType) {
  return {
    series: String(DEFAULT_SERIES),
    reps: getDefaultReps(measurementType),
    rir: '',
    rest_seconds: '',
    notes: '',
    superset_group: '',
  }
}

/**
 * Formulario a partir de una fila ya guardada (`routine_exercises` o
 * `session_exercises`), para editarla.
 *
 * El esfuerzo se descarta si no pertenece a la escala del tipo actual: hay filas
 * antiguas con RIR (0, o F = -1) en ejercicios sin reps, y mantenerlas dejaría el
 * formulario en un estado que nunca se puede guardar.
 *
 * @param {{series?: number, reps?: string, rir?: number|null, rest_seconds?: number|null, notes?: string|null, superset_group?: number|null}} row
 * @param {string} measurementType
 * @returns {object}
 */
export function buildExerciseConfigFormFromRow(row, measurementType) {
  const effortInScale = row.rir != null && isValidEffortValue(row.rir, measurementType)
  return {
    series: row.series != null ? String(row.series) : '',
    reps: row.reps ?? '',
    rir: effortInScale ? String(row.rir) : '',
    rest_seconds: row.rest_seconds != null ? String(row.rest_seconds) : '',
    notes: row.notes ?? '',
    superset_group: row.superset_group != null ? String(row.superset_group) : '',
  }
}

/**
 * Formulario a enviar al reemplazar un ejercicio por otro.
 * Limpia lo que es propio del ejercicio saliente (esfuerzo y notas) y, si el
 * tipo de medición cambia, también el objetivo: conservar "8-12" al reemplazar
 * un weight_reps por un level_time dejaría "Tiempo: 8-12" en la rutina.
 * @param {object} form
 * @param {string} newMeasurementType
 * @param {string} [oldMeasurementType]
 * @returns {object}
 */
export function buildReplaceExerciseForm(form, newMeasurementType, oldMeasurementType) {
  const typeChanged = newMeasurementType !== oldMeasurementType
  return {
    ...form,
    reps: typeChanged ? getDefaultReps(newMeasurementType) : form.reps,
    rir: '',
    notes: '',
  }
}

/**
 * Valida el formulario de configuración según el tipo de medición del ejercicio.
 * Devuelve un error por campo para pintarlo inline junto al input.
 *
 * `series` es obligatorio para TODOS los tipos, incluidos los de nivel/cardio:
 * es el número de filas que la pantalla de sesión genera para registrar
 * (3 × 30s a nivel 8 son 3 series), y `routine_exercises.series` es NOT NULL.
 * Lo que cambia por tipo es el objetivo (`reps` = reps/tiempo/distancia/kcal)
 * y la escala de esfuerzo (`rir` = RIR con reps, RPE sin ellas).
 *
 * Vale igual para rutina y para sesión: `series` y `reps` son NOT NULL en
 * `routine_exercises` y en `session_exercises`.
 *
 * @param {object} form - Formulario en crudo (todos los valores string)
 * @param {string} measurementType
 * @returns {{valid: boolean, errors: Record<string, string>}}
 */
export function validateExerciseConfigForm(form, measurementType) {
  const errors = {}

  const series = parseInt(form.series, 10)
  if (!Number.isInteger(series) || series < 1) {
    errors.series = t('validation:seriesMin')
  }

  if (!String(form.reps ?? '').trim()) {
    errors.reps = t('validation:targetRequired', { field: getRepsLabel(measurementType) })
  }

  if (!isEmptyField(form.rir) && !isValidEffortValue(parseInt(form.rir, 10), measurementType)) {
    errors.rir = t('validation:effortInvalid')
  }

  if (!isEmptyField(form.rest_seconds)) {
    const rest = parseInt(form.rest_seconds, 10)
    if (!Number.isInteger(rest) || rest < 0) {
      errors.rest_seconds = t('validation:restInvalid')
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

function isEmptyField(value) {
  return value === '' || value === null || value === undefined
}

/**
 * Parsea el formulario de configuración de ejercicio (strings) a datos tipados
 * para enviar al servidor. NO aplica defaults silenciosos: llama antes a
 * `validateExerciseConfigForm` y no envíes si no es válido.
 */
export function parseExerciseConfigForm(form) {
  return {
    series: parseInt(form.series, 10),
    reps: form.reps,
    rir: isEmptyField(form.rir) ? null : parseInt(form.rir, 10),
    rest_seconds: isEmptyField(form.rest_seconds) ? null : parseInt(form.rest_seconds, 10),
    notes: form.notes || null,
    superset_group: isEmptyField(form.superset_group) ? null : parseInt(form.superset_group, 10),
  }
}
