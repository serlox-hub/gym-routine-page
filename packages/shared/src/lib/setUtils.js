/**
 * Utilidades para manejo de series (sets)
 */

import { formatEffortBadge } from './effortScale.js'
import {
  FIELD_ORDER,
  SetField,
  formatFieldValue,
  getFieldMeta,
  getFieldSeparator,
  metersToDistanceUnit,
  normalizeTrackedFields,
  parseFieldValue,
  resolveTargetField,
} from './measurementFields.js'

/**
 * Crea una clave única para identificar una serie
 * @param {string|number} routineExerciseId - ID del ejercicio de rutina
 * @param {number} setNumber - Número de serie
 * @returns {string}
 */
export function createSetKey(routineExerciseId, setNumber) {
  return `${routineExerciseId}-${setNumber}`
}

/**
 * Verifica si un ID corresponde a un ejercicio extra (añadido durante la sesión)
 * @param {string|number} routineExerciseId - ID del ejercicio
 * @returns {boolean}
 */
export function isExtraExercise(routineExerciseId) {
  return typeof routineExerciseId === 'string' && routineExerciseId.startsWith('extra-')
}

/**
 * Genera un ID único para un ejercicio extra
 * @returns {string}
 */
export function generateExtraExerciseId() {
  return `extra-${Date.now()}`
}

/**
 * ¿Están rellenos todos los campos que mide el ejercicio? Es la condición para poder completar
 * la serie.
 * @param {string[]} trackedFields - campos del ejercicio
 * @param {{weight?: string|number, reps?: string|number, time?: string|number, distance?: string|number, calories?: string|number, level?: string|number, pace?: string|number}} data - Datos de la serie
 * @returns {boolean}
 */
export function isSetDataValid(trackedFields, data) {
  return normalizeTrackedFields(trackedFields).every(field => {
    const value = data?.[field]
    if (value === '' || value === undefined || value === null) return false
    // El ritmo es el único campo con mínimo: un 0 significaría velocidad infinita, y además es
    // lo que devuelve el input de duración mientras está a medio teclear.
    if (field === SetField.PACE) return Number(value) > 0
    return true
  })
}

/**
 * Extrae y tipa solo los valores de medición de una serie. Devuelve las claves internas
 * ({weight, repsCompleted, timeSeconds, ...}) sin metadatos (ids, rir, notas). Es la fuente única
 * del mapeo formulario→datos que comparten buildCompletedSetData (guardar), la caché de edición y
 * las comparaciones.
 * @param {string[]} trackedFields - campos del ejercicio
 * @param {{weight?: string|number, reps?: string|number, time?: string|number, distance?: string|number, calories?: string|number, level?: string|number, pace?: string|number}} formData
 * @param {{distanceUnit?: string}} [options]
 * @returns {Object} Solo los campos que mide el ejercicio (pueden ser NaN si el input está vacío)
 */
export function getSetMeasurementValues(trackedFields, formData, { distanceUnit = 'm' } = {}) {
  const data = {}
  normalizeTrackedFields(trackedFields).forEach(field => {
    data[getFieldMeta(field).payloadKey] = parseFieldValue(field, formData?.[field], { distanceUnit })
  })
  return data
}

/**
 * Construye el objeto de datos para completar una serie
 * @param {string[]} trackedFields - campos del ejercicio
 * @param {{weight?: string, reps?: string, time?: string, distance?: string, calories?: string}} formData - Datos del formulario
 * @param {{routineExerciseId?: string|number, sessionExerciseId?: string|number, exerciseId: number, setNumber: number, weightUnit?: string, rirActual?: number, notes?: string, videoUrl?: string}} info - Información adicional
 * @returns {Object} Datos para guardar la serie
 */
export function buildCompletedSetData(trackedFields, formData, info) {
  const { routineExerciseId, sessionExerciseId, exerciseId, setNumber, distanceUnit = 'm', rirActual, notes, videoUrl, setType } = info

  const data = {
    exerciseId,
    setNumber,
    rirActual,
    notes,
    ...getSetMeasurementValues(trackedFields, formData, { distanceUnit }),
  }

  // Soportar ambos IDs para flexibilidad
  if (sessionExerciseId !== undefined) data.sessionExerciseId = sessionExerciseId
  if (routineExerciseId !== undefined) data.routineExerciseId = routineExerciseId
  if (videoUrl !== undefined) data.videoUrl = videoUrl
  if (setType && setType !== 'normal') data.setType = setType

  return data
}

/**
 * Valores de medición para CACHEAR una serie NO completada. Devuelve los campos del ejercicio
 * con los vacíos normalizados a `null` (NO los descarta): así, al vaciar un campo, el
 * borrado sobrescribe la caché (el store hace merge) y no reaparece el valor viejo al
 * reabrir el ejercicio. `null` lo muestra `getSetInitialInputValues` como ''. Nunca NaN.
 * @returns {Object} Los campos de medición del ejercicio; vacíos como null
 */
export function buildCachedMeasurementValues(trackedFields, formData, { distanceUnit = 'm' } = {}) {
  const values = getSetMeasurementValues(trackedFields, formData, { distanceUnit })
  const cached = {}
  for (const [key, value] of Object.entries(values)) {
    cached[key] = (typeof value === 'number' && Number.isNaN(value)) ? null : value
  }
  // distanceToMeters colapsa '' → 0; para la caché, un campo de distancia vacío es "borrado"
  // (null), no 0 (que reaparecería como "0" al reabrir). Un 0 tecleado sí se conserva.
  if ('distanceMeters' in cached && (formData.distance === '' || formData.distance == null)) {
    cached.distanceMeters = null
  }
  return cached
}

/**
 * Resuelve los valores iniciales de los inputs de una serie a partir de los datos
 * conocidos en el store: primero la caché de edición (más reciente), si no los datos
 * completados. La distancia se convierte de metros a la unidad de display del ejercicio.
 * No incluye el prefill de la sesión anterior (llega de forma asíncrona y se aplica aparte).
 * @param {{setData?: Object, cachedData?: Object, distanceUnit?: string}} params
 * @returns {{weight: string|number, reps: string|number, time: string|number, distance: string|number, calories: string|number, level: string|number, pace: string|number}}
 */
export function getSetInitialInputValues({ setData, cachedData, distanceUnit = 'm' } = {}) {
  const src = cachedData || setData || {}
  const val = (v) => (v == null || (typeof v === 'number' && Number.isNaN(v)) ? '' : v)
  const meters = src.distanceMeters
  return {
    weight: val(src.weight),
    reps: val(src.repsCompleted),
    time: val(src.timeSeconds),
    distance: val(meters) === '' ? '' : metersToDistanceUnit(meters, distanceUnit),
    calories: val(src.caloriesBurned),
    level: val(src.level),
    pace: val(src.paceSeconds),
  }
}

/**
 * Compara los valores de medición actuales contra los ya almacenados.
 * Solo mira las claves presentes en `values`. NaN y ausente se tratan como equivalentes.
 * @param {Object} stored - Datos almacenados (setData o cachedData); puede ser undefined
 * @param {Object} values - Valores de medición actuales
 * @returns {boolean} true si algún valor cambió
 */
export function setMeasurementValuesChanged(stored, values) {
  const norm = (v) => (v == null || (typeof v === 'number' && Number.isNaN(v)) ? null : v)
  const source = stored || {}
  return Object.keys(values).some(key => norm(values[key]) !== norm(source[key]))
}

/**
 * Placeholder del input de la columna OBJETIVO en la fila de serie: el valor prescrito por la
 * rutina (ej. "8-12", "20min") cuando existe, o "—" si no hay objetivo. Da orientación en filas
 * sin historial, pegado a donde se teclea.
 *
 * No confundir con `getTargetPlaceholder` (measurementFields), que es el "Ej: 8-12" del
 * FORMULARIO de configuración; esto pinta el objetivo real de este ejercicio.
 * @param {string|number|null|undefined} target
 * @returns {string}
 */
export function formatSetTargetPlaceholder(target) {
  return target != null && String(target).trim() !== '' ? String(target) : '—'
}

/**
 * Objetivo de la rutina para pintarlo en la subfila de la serie, o null si no procede.
 *
 * Con el campo objetivo guardado (issue #28) el objetivo vive en el placeholder de SU columna, que
 * es donde mejor está: pegado a donde se teclea. Esta subfila queda solo para el caso en el que no
 * hay columna a la que anclarlo: un ejercicio que no mide ninguno de los cuatro campos que pueden
 * ser objetivo (p. ej. solo peso) y cuyo objetivo es texto libre sin campo.
 * @param {string[]} trackedFields
 * @param {string|number|null|undefined} target - `routine_exercises.reps`
 * @param {string|null} [targetField] - `routine_exercises.target_field`
 * @returns {string|null}
 */
export function formatSetTargetHint(trackedFields, target, targetField) {
  if (resolveTargetField(targetField, trackedFields)) return null
  const text = target == null ? '' : String(target).trim()
  return text === '' ? null : text
}

/**
 * Formatea el valor de una serie leída de BD (snake_case), para historial y resúmenes.
 * No recibe los campos del ejercicio: pinta lo que la fila tenga a null, en el orden canónico
 * de columnas. Las reps siempre llevan unidad ("80kg × 12 reps"): aquí hay sitio de sobra y no
 * hay cabecera que la indique, a diferencia de la fila de la sesión.
 * @param {{weight?: number, weight_unit?: string, reps_completed?: number, time_seconds?: number, distance_meters?: number, calories_burned?: number, level?: number, pace_seconds?: number}} set
 * @returns {string}
 */
export function formatSetValue(set, { distanceUnit = 'm' } = {}) {
  const options = { weightUnit: set.weight_unit || 'kg', distanceUnit, repsUnit: true }
  return joinFieldParts(
    FIELD_ORDER
      .filter(field => set[getFieldMeta(field).column] != null)
      .map(field => ({ field, text: formatFieldValue(field, set[getFieldMeta(field).column], options) }))
  )
}

/**
 * Une las partes ya formateadas de una serie con su separador ("×", o "@" antes del ritmo).
 * @param {Array<{field: string, text: string}>} parts
 * @returns {string}
 */
function joinFieldParts(parts) {
  return parts.reduce(
    (acc, { field, text }, i) => i === 0 ? text : acc + getFieldSeparator(field) + text,
    ''
  )
}

/**
 * Formatea el valor de una serie con los campos que mide el ejercicio (objeto de display en
 * camelCase: weight, reps, timeSeconds, distanceMeters, caloriesBurned, level, paceSeconds).
 *
 * Solo pinta los campos CON valor, así que un peso a null en un ejercicio de peso × reps sale
 * como "12 reps" en vez de " × 12". Las reps llevan unidad únicamente cuando van solas: junto a
 * otro campo el "reps" sobra y roba sitio ("80kg × 12").
 * @param {object} set
 * @param {string[]} trackedFields - campos del ejercicio
 * @param {{distanceUnit?: string}} [options]
 * @returns {string}
 */
export function formatSetValueByType(set, trackedFields, { distanceUnit = 'm' } = {}) {
  const present = normalizeTrackedFields(trackedFields)
    .filter(field => set[getFieldMeta(field).displayKey] != null)
  const options = {
    weightUnit: set.weightUnit || 'kg',
    distanceUnit,
    repsUnit: present.length === 1,
  }
  return joinFieldParts(present.map(field => ({
    field,
    text: formatFieldValue(field, set[getFieldMeta(field).displayKey], options),
  })))
}

/**
 * Formatea el valor de la serie de la sesión anterior (subfila SetRowMeta → PreviousSetLine).
 */
export function formatPreviousSetValue(set, trackedFields, { weightUnit = 'kg', distanceUnit = 'm' } = {}) {
  return formatSetValueByType({ ...set, weightUnit }, trackedFields, { distanceUnit })
}

/**
 * Esfuerzo (RIR/RPE) de la serie anterior, al final de su línea en la subfila.
 * Devuelve el badge ("@2" en tipos con reps, etiqueta RPE en el resto vía formatEffortBadge, mismo
 * formato que la columna de esfuerzo actual) o null si no procede: `showRir` false (el usuario ha
 * ocultado la escala de RIR/esfuerzo, así que tampoco mostramos el histórico) o la serie previa no
 * registró esfuerzo. Gating idéntico web+native.
 * @param {{rir?: number}} previousSet
 * @param {string[]} trackedFields
 * @param {boolean} showRir
 * @returns {string|null}
 */
export function formatPreviousSetEffort(previousSet, trackedFields, showRir) {
  if (!showRir || previousSet?.rir == null) return null
  return formatEffortBadge(previousSet.rir, trackedFields) || null
}

/**
 * Filtra y ordena series para un ejercicio específico
 * @param {Object} completedSets - Mapa de series completadas
 * @param {string|number} routineExerciseId - ID del ejercicio
 * @returns {Array} Series filtradas y ordenadas por número
 */
export function getSetsForExercise(completedSets, routineExerciseId) {
  return Object.values(completedSets)
    .filter(set => set.routineExerciseId === routineExerciseId)
    .sort((a, b) => a.setNumber - b.setNumber)
}

/**
 * ¿Mostrar la columna «Notas» (esfuerzo/anotación) en la lista de series durante la sesión?
 * Presente si hay algo que anotar: RIR, notas o vídeo activados en preferencias. Fuente ÚNICA
 * para SetRow y SetsList (web+native) → cabecera y filas nunca se desincronizan. El gating fino
 * del vídeo (plan/canUploadVideo) vive en la hoja; aquí solo cuenta la preferencia. Los defaults
 * son `true` (columna visible salvo que el usuario apague las tres). Ver DECISIONS (SUPERSEDE #85).
 * @param {{show_rir_input?: boolean, show_set_notes?: boolean, show_video_upload?: boolean}} [preferences]
 * @returns {boolean}
 */
export function shouldShowAnnotationColumn(preferences) {
  return (preferences?.show_rir_input ?? true) ||
    (preferences?.show_set_notes ?? true) ||
    (preferences?.show_video_upload ?? true)
}
