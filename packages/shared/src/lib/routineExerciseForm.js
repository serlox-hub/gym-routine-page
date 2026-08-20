import { t } from '../i18n/index.js'
import { isValidEffortValue } from './effortScale.js'
import {
  MAX_PRESCRIBED_LEVEL,
  getDefaultTarget,
  getDefaultTargetField,
  getTargetLabel,
  resolveTargetField,
  sameTrackedFields,
  tracksLevel,
} from './measurementFields.js'

const DEFAULT_SERIES = 3

/**
 * Estado inicial del formulario de configuración de un ejercicio en rutina.
 * El campo objetivo (`target_field`) y su valor (`reps`) se prellenan según lo que mide el
 * ejercicio: uno de nivel × tiempo arranca en "Tiempo" y "30s", no en "Reps" y "8-12".
 * @param {string[]} [trackedFields]
 * @returns {object}
 */
export function buildExerciseConfigForm(trackedFields) {
  const targetField = getDefaultTargetField(trackedFields)
  return {
    series: String(DEFAULT_SERIES),
    target_field: targetField ?? '',
    reps: getDefaultTarget(targetField, trackedFields),
    level: '',
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
 * El esfuerzo se descarta si no pertenece a la escala actual del ejercicio: hay filas
 * antiguas con RIR (0, o F = -1) en ejercicios sin reps, y mantenerlas dejaría el
 * formulario en un estado que nunca se puede guardar.
 *
 * @param {{series?: number, reps?: string, target_field?: string|null, level?: number|null, rir?: number|null, rest_seconds?: number|null, notes?: string|null, superset_group?: number|null}} row
 * @param {string[]} trackedFields
 * @returns {object}
 */
export function buildExerciseConfigFormFromRow(row, trackedFields) {
  const effortInScale = row.rir != null && isValidEffortValue(row.rir, trackedFields)
  return {
    series: row.series != null ? String(row.series) : '',
    target_field: resolveTargetField(row.target_field, trackedFields) ?? '',
    reps: row.reps ?? '',
    level: row.level != null ? String(row.level) : '',
    rir: effortInScale ? String(row.rir) : '',
    rest_seconds: row.rest_seconds != null ? String(row.rest_seconds) : '',
    notes: row.notes ?? '',
    superset_group: row.superset_group != null ? String(row.superset_group) : '',
  }
}

/**
 * Formulario tras cambiar el CAMPO objetivo (el selector junto al input de objetivo).
 * El valor anterior no se conserva: "8-12" en un objetivo de tiempo se leería como 8-12 segundos,
 * y `parseTargetRange` necesita la unidad explícita del default para poder comparar.
 * @param {object} form
 * @param {string} targetField
 * @param {string[]} trackedFields
 * @returns {object}
 */
export function buildTargetFieldChangeForm(form, targetField, trackedFields) {
  if (targetField === form.target_field) return form
  return { ...form, target_field: targetField, reps: getDefaultTarget(targetField, trackedFields) }
}

/**
 * Formulario a enviar al reemplazar un ejercicio por otro.
 * Limpia lo que es propio del ejercicio saliente (esfuerzo y notas) y, si lo que se mide
 * cambia, también el objetivo (campo + valor) y el nivel prescrito: conservar "8-12" al
 * reemplazar un peso × reps por un nivel × tiempo dejaría "Tiempo: 8-12" en la rutina.
 * @param {object} form
 * @param {string[]} newTrackedFields
 * @param {string[]} [oldTrackedFields]
 * @returns {object}
 */
export function buildReplaceExerciseForm(form, newTrackedFields, oldTrackedFields) {
  // Comparación por VALOR: son arrays, y `!==` daría siempre "cambió" aunque midan lo mismo.
  const fieldsChanged = !sameTrackedFields(newTrackedFields, oldTrackedFields)
  const targetField = fieldsChanged
    ? getDefaultTargetField(newTrackedFields)
    : resolveTargetField(form.target_field, newTrackedFields)
  return {
    ...form,
    target_field: targetField ?? '',
    reps: fieldsChanged ? getDefaultTarget(targetField, newTrackedFields) : form.reps,
    level: tracksLevel(newTrackedFields) && !fieldsChanged ? form.level : '',
    rir: '',
    notes: '',
  }
}

/**
 * Valida el formulario de configuración según lo que mide el ejercicio.
 * Devuelve un error por campo para pintarlo inline junto al input.
 *
 * `series` es obligatorio para TODOS los ejercicios, incluidos los de nivel/cardio:
 * es el número de filas que la pantalla de sesión genera para registrar
 * (3 × 30s a nivel 8 son 3 series), y `routine_exercises.series` es NOT NULL.
 * Lo que cambia según los campos es de qué habla el objetivo (`target_field` +
 * `reps` = reps/tiempo/distancia/kcal) y la escala de esfuerzo (`rir` = RIR con reps, RPE sin
 * ellas). El nivel prescrito es opcional: solo lo piden los ejercicios que miden nivel.
 *
 * Vale igual para rutina y para sesión: `series` y `reps` son NOT NULL en
 * `routine_exercises` y en `session_exercises`.
 *
 * @param {object} form - Formulario en crudo (todos los valores string)
 * @param {string[]} trackedFields
 * @returns {{valid: boolean, errors: Record<string, string>}}
 */
export function validateExerciseConfigForm(form, trackedFields) {
  const errors = {}

  const series = parseInt(form.series, 10)
  if (!Number.isInteger(series) || series < 1) {
    errors.series = t('validation:seriesMin')
  }

  if (!String(form.reps ?? '').trim()) {
    errors.reps = t('validation:targetRequired', {
      field: getTargetLabel(resolveTargetField(form.target_field, trackedFields)),
    })
  }

  // Se valida contra el STRING, no contra `parseInt`: "8.5" daría 8 y guardaría un nivel que el
  // usuario no ha escrito (el input web es `type=number` y deja teclear el punto).
  if (!isEmptyField(form.level)) {
    const level = Number(form.level)
    const isWholeNumber = /^\d+$/.test(String(form.level).trim())
    if (!isWholeNumber || level > MAX_PRESCRIBED_LEVEL) {
      errors.level = t('validation:levelInvalid', { max: MAX_PRESCRIBED_LEVEL })
    }
  }

  if (!isEmptyField(form.rir) && !isValidEffortValue(parseInt(form.rir, 10), trackedFields)) {
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
    target_field: isEmptyField(form.target_field) ? null : form.target_field,
    reps: form.reps,
    level: isEmptyField(form.level) ? null : parseInt(form.level, 10),
    rir: isEmptyField(form.rir) ? null : parseInt(form.rir, 10),
    rest_seconds: isEmptyField(form.rest_seconds) ? null : parseInt(form.rest_seconds, 10),
    notes: form.notes || null,
    superset_group: isEmptyField(form.superset_group) ? null : parseInt(form.superset_group, 10),
  }
}
