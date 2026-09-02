/**
 * Registro de CAMPOS de medición: la fuente única de qué puede medir un ejercicio.
 *
 * Un ejercicio declara sus `tracked_fields` (1 a 3 campos de los 7 de abajo) en vez de elegir
 * un "tipo" de una lista cerrada. El modelo anterior (`measurement_type`, enum de 12 combinaciones
 * escritas a mano) era un producto cartesiano PARCIAL: solo cubría pares, así que un ejercicio con
 * tres métricas reales (bici estática = nivel + distancia + tiempo) no tenía representación y no
 * había forma de añadirla sin ampliar el enum otra vez. Ver docs/DECISIONS.md.
 *
 * Todo lo que antes hacía `switch` sobre 12 casos (columnas de la fila, validación, parseo,
 * formateo, métricas de stats y de PR) se deriva ahora de esta lista de campos.
 */

import { t } from '../i18n/index.js'
import { parseDecimal } from './numberUtils.js'
import { formatDuration, formatSecondsAsMMSS } from './timeUtils.js'

export const SetField = {
  WEIGHT: 'weight',
  REPS: 'reps',
  TIME: 'time',
  DISTANCE: 'distance',
  CALORIES: 'calories',
  LEVEL: 'level',
  PACE: 'pace',
}

/**
 * Orden canónico de las columnas de valor. Los campos se normalizan SIEMPRE a este orden al
 * leerlos, así que el orden con el que se guardaron en BD da igual.
 * Reproduce el orden que tenían los 12 tipos históricos: peso·reps, peso·tiempo, nivel·kcal,
 * distancia·tiempo, distancia·ritmo…
 */
export const FIELD_ORDER = [
  SetField.WEIGHT,
  SetField.LEVEL,
  SetField.DISTANCE,
  SetField.REPS,
  SetField.TIME,
  SetField.PACE,
  SetField.CALORIES,
]

/**
 * Tope de campos por ejercicio. Es un límite de LAYOUT, no de modelo de datos (`completed_sets`
 * tiene columna propia para los 7).
 *
 * Aritmética (fuente única; la migración 055 y docs/DECISIONS.md remiten aquí, no repiten cifras).
 * A 360px de pantalla, la pista útil de la fila son **285px**: 360 − 64 (página `p-4` + card
 * `px-4`) − 8 (`px-1` del CONTENEDOR del bloque de serie, ver `SetRow`; ya no lo pone la fila de
 * valores) − 3 (`SET_ROW_ACCENT`, la barra de "hecho"). Las columnas fijas son
 * SERIE 32 + NOTAS 44 (62 en la escala RPE, que pinta palabras) + ✓ 44, con gap 6 entre las N+3
 * columnas. Lo que queda se reparte entre los N valores:
 *   N=2 (peso × reps, NOTAS 44) → (285 − 120 − 24) / 2 ≈ **70px** por input
 *   N=3 (cardio, NOTAS 62)      → (285 − 138 − 30) / 3 ≈ **39px**, el mínimo en el que cabe "20:00"
 *   N=4 (cardio, NOTAS 62)      → (285 − 138 − 36) / 4 ≈ **28px**, el valor deja de leerse
 * No subir de 3 sin rehacer la fila. Los anchos vivos están en `SetRow` (`COL_*`/`getSetGridTemplate`).
 */
export const MAX_TRACKED_FIELDS = 3

export const DEFAULT_TRACKED_FIELDS = [SetField.WEIGHT, SetField.REPS]

/**
 * Tope del nivel de máquina, tanto el prescrito (`routine_exercises.level`) como el registrado.
 * Ambas columnas son `smallint`, así que sin tope un 40000 pasa la validación y muere en BD con
 * 22003; y ninguna máquina de gimnasio pasa de tres cifras. Lo comparten la validación del
 * formulario y el saneo del JSON importado.
 */
export const MAX_PRESCRIBED_LEVEL = 999

/**
 * Metadatos estáticos por campo:
 * - `column`     columna de `completed_sets` (fila leída de BD, snake_case)
 * - `payloadKey` clave del payload de `upsertCompletedSet` (escritura, camelCase)
 * - `displayKey` clave en el objeto de display que reciben los formateadores de serie
 * - `decimal`    admite decimales (cambia el teclado en móvil, no la validación)
 *
 * Los tres nombres NO coinciden entre sí, y ese desajuste es justo lo que cada pantalla se
 * inventaba por su cuenta antes de que existiera este mapa.
 */
const FIELD_META = {
  [SetField.WEIGHT]: { column: 'weight', payloadKey: 'weight', displayKey: 'weight', decimal: true },
  [SetField.REPS]: { column: 'reps_completed', payloadKey: 'repsCompleted', displayKey: 'reps', decimal: false },
  [SetField.TIME]: { column: 'time_seconds', payloadKey: 'timeSeconds', displayKey: 'timeSeconds', decimal: false },
  [SetField.DISTANCE]: { column: 'distance_meters', payloadKey: 'distanceMeters', displayKey: 'distanceMeters', decimal: true },
  [SetField.CALORIES]: { column: 'calories_burned', payloadKey: 'caloriesBurned', displayKey: 'caloriesBurned', decimal: false },
  [SetField.LEVEL]: { column: 'level', payloadKey: 'level', displayKey: 'level', decimal: false },
  [SetField.PACE]: { column: 'pace_seconds', payloadKey: 'paceSeconds', displayKey: 'paceSeconds', decimal: false },
}

export function getFieldMeta(field) {
  return FIELD_META[field]
}

export function isValidField(field) {
  return Object.prototype.hasOwnProperty.call(FIELD_META, field)
}

// ============================================
// NORMALIZACIÓN Y RESOLUCIÓN
// ============================================

/**
 * Ordena y limpia una selección de campos SIN imponer un mínimo: sin inválidos, sin duplicados y
 * en `FIELD_ORDER`. Puede devolver la lista vacía, que es un estado legítimo mientras se edita
 * (para cambiar de peso × reps a nivel × distancia × tiempo hay que poder desmarcar antes), y por
 * eso es la base de `toggleTrackedField`, que es lo que usa el selector.
 * Para LEER lo que mide un ejercicio usa `normalizeTrackedFields`, que sí garantiza contenido.
 * @param {string[]|null|undefined} fields
 * @returns {string[]}
 */
export function sortTrackedFields(fields) {
  if (!Array.isArray(fields)) return []
  const valid = new Set(fields.filter(isValidField))
  return FIELD_ORDER.filter(f => valid.has(f)).slice(0, MAX_TRACKED_FIELDS)
}

/**
 * Deja una lista de campos en su forma canónica: sin inválidos, sin duplicados, en `FIELD_ORDER`
 * y recortada a `MAX_TRACKED_FIELDS`. Si no queda nada usable cae al default (peso × reps).
 *
 * Se aplica en TODA lectura (no solo al guardar) para que un valor sucio en BD, un JSON importado
 * a mano o un orden distinto no puedan hacer que dos pantallas pinten columnas diferentes.
 * @param {string[]|null|undefined} fields
 * @returns {string[]}
 */
export function normalizeTrackedFields(fields) {
  const ordered = sortTrackedFields(fields)
  return ordered.length > 0 ? ordered : [...DEFAULT_TRACKED_FIELDS]
}

/**
 * Marca o desmarca un campo en el selector del formulario. Al llegar al máximo, marcar otro no
 * hace nada (el selector además deshabilita los que sobran, así que esto es la red de seguridad).
 * Desmarcar el último deja la selección vacía a propósito: el formulario lo señala como error,
 * en vez de que el chip "no se apague" sin explicación.
 * @param {string[]} fields
 * @param {string} field
 * @returns {string[]}
 */
export function toggleTrackedField(fields, field) {
  const current = sortTrackedFields(fields)
  if (current.includes(field)) return current.filter(f => f !== field)
  if (current.length >= MAX_TRACKED_FIELDS || !isValidField(field)) return current
  return sortTrackedFields([...current, field])
}

/** ¿La selección del formulario se puede guardar? (entre 1 y MAX_TRACKED_FIELDS campos válidos) */
export function isTrackedFieldsSelectionValid(fields) {
  const selected = sortTrackedFields(fields)
  return selected.length >= 1 && selected.length <= MAX_TRACKED_FIELDS
}

/**
 * Campos que mide un ejercicio, con el fallback único de la app. `exercises.tracked_fields` es
 * NOT NULL en BD, pero el ejercicio llega null/parcial en varios caminos (query sin la columna,
 * ejercicio extra recién creado en sesión), y resolverlo distinto en cada pantalla hace que el
 * mismo dato se lea con columnas distintas.
 * @param {object|null} exercise
 * @returns {string[]}
 */
export function resolveTrackedFields(exercise) {
  return normalizeTrackedFields(exercise?.tracked_fields)
}

/** ¿Las dos listas de campos son la misma? (comparación por valor, ya normalizadas) */
export function sameTrackedFields(a, b) {
  const na = normalizeTrackedFields(a)
  const nb = normalizeTrackedFields(b)
  return na.length === nb.length && na.every((f, i) => f === nb[i])
}

export const tracksWeight = (fields) => normalizeTrackedFields(fields).includes(SetField.WEIGHT)
export const tracksReps = (fields) => normalizeTrackedFields(fields).includes(SetField.REPS)
export const tracksTime = (fields) => normalizeTrackedFields(fields).includes(SetField.TIME)
export const tracksDistance = (fields) => normalizeTrackedFields(fields).includes(SetField.DISTANCE)
export const tracksLevel = (fields) => normalizeTrackedFields(fields).includes(SetField.LEVEL)
export const tracksPace = (fields) => normalizeTrackedFields(fields).includes(SetField.PACE)

// ============================================
// ETIQUETAS
// ============================================

/** Nombre largo del campo para formularios y etiquetas ("Peso", "Nivel", "Ritmo"). */
export function getFieldName(field) {
  return t(`data:measurementFields.${field}`)
}

/**
 * Etiqueta derivada de lo que mide un ejercicio: "Nivel × Distancia × Tiempo". Sustituye a las 12
 * cadenas fijas que había por tipo — con campos libres no hay lista que mantener, el nombre sale
 * de los propios campos.
 * Sin campos devuelve '' (selección vacía en el formulario), NO la etiqueta del default: el
 * selector estaría mintiendo sobre lo que hay marcado.
 */
export function formatTrackedFieldsLabel(fields) {
  return sortTrackedFields(fields).map(getFieldName).join(' × ')
}

/**
 * Cabecera de la columna en la fila de serie. Corta a propósito: la columna mide ~40-70px en
 * móvil. "MM:SS" además comunica el formato del input de duración (ver durationInput.js).
 */
export function getFieldHeader(field, { weightUnit = 'kg', distanceUnit = 'm' } = {}) {
  switch (field) {
    case SetField.WEIGHT: return (weightUnit || 'kg').toUpperCase()
    case SetField.REPS: return t('workout:set.reps').toUpperCase()
    case SetField.TIME: return 'MM:SS'
    case SetField.DISTANCE: return (distanceUnit || 'm').toUpperCase()
    case SetField.CALORIES: return 'KCAL'
    case SetField.LEVEL: return t('workout:set.level').toUpperCase()
    case SetField.PACE: return t('workout:set.pace').toUpperCase()
    default: return ''
  }
}

/**
 * Unidad para pantallas SIN cabecera de columna (edición desde el historial): va pegada al input.
 * En tiempo es "min", no "MM:SS": ahí no describe el formato, dice en qué unidad está el valor
 * ("24:00" a secas se lee como horas tan fácil como como minutos).
 */
export function getFieldUnit(field, { weightUnit = 'kg', distanceUnit = 'm' } = {}) {
  switch (field) {
    case SetField.WEIGHT: return weightUnit || 'kg'
    case SetField.REPS: return t('workout:set.reps').toLowerCase()
    case SetField.TIME: return 'min'
    case SetField.DISTANCE: return distanceUnit || 'm'
    case SetField.CALORIES: return 'kcal'
    case SetField.LEVEL: return t('workout:set.level').toLowerCase()
    // El ritmo se teclea con el mismo input de duración que el tiempo, así que aquí la pista útil
    // es el FORMATO. Nada de `min/${distanceUnit}`: con la unidad sin cablear (issue #24) salía
    // "min/m", minutos por metro, que no es como nadie mide un ritmo.
    case SetField.PACE: return 'mm:ss'
    default: return ''
  }
}

// ============================================
// CONVERSIÓN DE DISTANCIA
// ============================================

/** Convierte un valor de distancia a metros según la unidad */
export function distanceToMeters(value, distanceUnit) {
  const num = parseDecimal(value)
  if (isNaN(num)) return 0
  return distanceUnit === 'km' ? Math.round(num * 1000) : num
}

/** Convierte metros a la unidad indicada */
export function metersToDistanceUnit(meters, distanceUnit) {
  if (!meters) return 0
  return distanceUnit === 'km' ? +(meters / 1000).toFixed(3) : meters
}

// ============================================
// PARSEO Y FORMATEO POR CAMPO
// ============================================

/**
 * Parsea el valor de un input al tipo que se persiste. La distancia es el único campo con
 * conversión de unidad (el input está en la unidad de display, la BD siempre en metros).
 */
export function parseFieldValue(field, value, { distanceUnit = 'm' } = {}) {
  switch (field) {
    case SetField.WEIGHT: return parseDecimal(value)
    case SetField.DISTANCE: return distanceToMeters(value, distanceUnit)
    default: return parseInt(value)
  }
}

/** Formatea un número con coma decimal (formato español) */
function formatNumber(value) {
  if (value == null) return ''
  return Number(value).toLocaleString('es-ES')
}

/**
 * Formatea el valor de UN campo para mostrar, con su unidad.
 * @param {string} field
 * @param {number} value - ya en unidad de BD (metros para distancia, segundos para tiempo/ritmo)
 * @param {{weightUnit?: string, distanceUnit?: string, repsUnit?: boolean}} options
 *   repsUnit: añade "reps" tras el número. En la fila de sesión las reps van desnudas cuando
 *   acompañan a otro campo ("80kg × 12"); en el historial, con más sitio, siempre llevan unidad.
 */
export function formatFieldValue(field, value, { weightUnit = 'kg', distanceUnit = 'm', repsUnit = false } = {}) {
  switch (field) {
    case SetField.WEIGHT:
      return `${formatNumber(value)}${weightUnit || 'kg'}`
    case SetField.REPS:
      return `${value}${repsUnit ? ` ${t('workout:set.reps').toLowerCase()}` : ''}`
    case SetField.TIME:
      return formatDuration(value)
    case SetField.DISTANCE:
      return `${formatNumber(metersToDistanceUnit(value, distanceUnit))}${distanceUnit}`
    case SetField.CALORIES:
      return `${value}kcal`
    case SetField.LEVEL:
      return `${t('workout:set.levelShort')}${value}`
    case SetField.PACE:
      return `${formatSecondsAsMMSS(value)}/${distanceUnit}`
    default:
      return ''
  }
}

/** Separador con el que un campo se une al anterior. El ritmo va con "@" ("5km @ 5:00/km"). */
export function getFieldSeparator(field) {
  return field === SetField.PACE ? ' @ ' : ' × '
}

// ============================================
// PAPELES DE LOS CAMPOS (progresable / objetivo / resultado)
// ============================================

/**
 * Cada campo de un ejercicio juega uno de tres papeles, y el papel lo decide EL EJERCICIO, no el
 * tipo de campo (issue #28):
 * - progresable: lo que empujas hacia arriba con el tiempo (peso en el press banca, NIVEL en la bici)
 * - objetivo:    lo que prescribe la rutina ("8-12", "20 min", "5 km")
 * - resultado:   lo que sale de hacerlo (en la bici, la distancia si el objetivo es el tiempo)
 *
 * El objetivo se GUARDA (`routine_exercises.target_field`), ya no se adivina al pintarlo: el valor
 * es texto libre y sin el campo la app no sabía si "20min" hablaba de tiempo o de qué.
 */

// Campos que pueden ser objetivo: los que expresan "cuánto" pide la rutina. No se exporta (la
// pregunta pública es `isTargetField`/`getTargetableFields`); la migración 056 lo cita por nombre.
const TARGET_FIELDS = [SetField.REPS, SetField.TIME, SetField.DISTANCE, SetField.CALORIES]

/** ¿Este campo puede ser el objetivo de un ejercicio? El peso, el nivel y el ritmo nunca lo son:
 * los dos primeros son el progresable y el tercero sale de dividir distancia entre tiempo. */
export function isTargetField(field) {
  return TARGET_FIELDS.includes(field)
}

/** Campos entre los que se elige el objetivo de ESTE ejercicio, en orden canónico (0 a 3). */
export function getTargetableFields(trackedFields) {
  const tracked = normalizeTrackedFields(trackedFields)
  return FIELD_ORDER.filter(field => isTargetField(field) && tracked.includes(field))
}

// Orden en el que se propone el objetivo cuando el ejercicio se añade a una rutina y nadie ha
// elegido todavía. Es la lista heredada del enum de 12 tipos (distancia antes que tiempo porque
// `distance_time` etiquetaba distancia): se conserva SOLO como default de formulario y como
// lectura de filas antiguas, para que el backfill y el import de JSON viejo coincidan con lo que
// la app venía asumiendo. Ya no decide nada en pantalla.
const DEFAULT_TARGET_PRIORITY = [SetField.REPS, SetField.DISTANCE, SetField.TIME, SetField.CALORIES]

/**
 * Campo objetivo propuesto para un ejercicio sin elección guardada. null si no mide ninguno de los
 * cuatro (p. ej. solo peso): ahí el objetivo es texto libre sin campo al que anclarse.
 * @param {string[]|null} trackedFields
 * @returns {string|null}
 */
export function getDefaultTargetField(trackedFields) {
  const tracked = normalizeTrackedFields(trackedFields)
  return DEFAULT_TARGET_PRIORITY.find(field => tracked.includes(field)) ?? null
}

/**
 * Campo objetivo de una fila de rutina/sesión, con el fallback único de la app (mismo patrón que
 * `resolveTrackedFields`). Se descarta el guardado si el ejercicio ya no mide ese campo: cambiar
 * `tracked_fields` de peso × reps a nivel × tiempo dejaría un objetivo apuntando a reps.
 * @param {string|null|undefined} targetField - `routine_exercises.target_field` / `session_exercises.target_field`
 * @param {string[]|null} trackedFields
 * @returns {string|null}
 */
export function resolveTargetField(targetField, trackedFields) {
  const targetable = getTargetableFields(trackedFields)
  return targetable.includes(targetField) ? targetField : getDefaultTargetField(trackedFields)
}

/**
 * Campo PROGRESABLE del ejercicio: el que se sube con el tiempo. Derivado, no configurable — el
 * peso cuando lo mide y el nivel cuando no (en una máquina de cardio el nivel juega exactamente
 * el papel del peso). null si no mide ninguno de los dos: no hay nada que subir.
 * @param {string[]|null} trackedFields
 * @returns {string|null}
 */
export function getProgressableField(trackedFields) {
  const tracked = normalizeTrackedFields(trackedFields)
  if (tracked.includes(SetField.WEIGHT)) return SetField.WEIGHT
  if (tracked.includes(SetField.LEVEL)) return SetField.LEVEL
  return null
}

// Qué campo resume una serie en gráficas y tarjetas de historial. El peso manda cuando lo hay
// (es el dato que progresa); si no, el nivel; si no, la magnitud del trabajo.
const CHART_FIELD_PRIORITY = [
  SetField.WEIGHT, SetField.LEVEL, SetField.DISTANCE, SetField.CALORIES, SetField.TIME,
  SetField.PACE, SetField.REPS,
]

/** Campo que resume el esfuerzo de una serie para gráficas. Nunca null (reps es el último recurso). */
export function getPrimaryChartField(fields) {
  const tracked = normalizeTrackedFields(fields)
  return CHART_FIELD_PRIORITY.find(f => tracked.includes(f)) ?? SetField.REPS
}

/**
 * Etiqueta del objetivo en la config de rutina ("Repeticiones", "Tiempo", "Distancia").
 * Sin campo objetivo se queda en "Objetivo": el valor sigue siendo obligatorio (texto libre),
 * solo que no habla de ninguna de las medidas del ejercicio.
 * @param {string|null} targetField
 */
export function getTargetLabel(targetField) {
  switch (targetField) {
    case SetField.REPS: return t('exercise:repsLabel.reps')
    case SetField.TIME: return t('exercise:repsLabel.time')
    case SetField.DISTANCE: return t('exercise:repsLabel.distance')
    case SetField.CALORIES: return t('exercise:repsLabel.calories')
    default: return t('exercise:repsLabel.target')
  }
}

/** Placeholder del input de objetivo en el formulario ("Ej: 8-12"). */
export function getTargetPlaceholder(targetField, trackedFields) {
  switch (targetField) {
    case SetField.REPS: return t('exercise:repsPlaceholder.reps')
    case SetField.TIME: return t('exercise:repsPlaceholder.time')
    case SetField.CALORIES: return t('exercise:repsPlaceholder.calories')
    case SetField.DISTANCE:
      return isEnduranceDistance(trackedFields)
        ? t('exercise:repsPlaceholder.distanceTime')
        : t('exercise:repsPlaceholder.distance')
    default: return ''
  }
}

// Distancia acompañada de tiempo o ritmo = cardio de recorrido (cinta, bici, correr), donde el
// objetivo se escribe en kilómetros. La distancia SOLA es trabajo corto (farmer walk, sprints):
// se escribe en metros. Es el único default que no sale del campo objetivo a secas.
function isEnduranceDistance(fields) {
  const tracked = normalizeTrackedFields(fields)
  return tracked.includes(SetField.DISTANCE) &&
    (tracked.includes(SetField.TIME) || tracked.includes(SetField.PACE))
}

/**
 * Objetivo por defecto al añadir el ejercicio a una rutina o al cambiar de campo objetivo.
 * Siempre lleva unidad explícita: es lo que permite que `parseTargetRange` (progressionUtils)
 * sepa si "20" son segundos o minutos.
 */
export function getDefaultTarget(targetField, trackedFields) {
  switch (targetField) {
    case SetField.TIME: return '30s'
    case SetField.CALORIES: return '100kcal'
    case SetField.DISTANCE: return isEnduranceDistance(trackedFields) ? '5km' : '40m'
    case SetField.REPS: return '8-12'
    default: return ''
  }
}

// ============================================
// COMPATIBILIDAD CON EL MODELO ANTERIOR
// ============================================

/**
 * Traduce un `measurement_type` de los 12 históricos a sus campos.
 *
 * ⚠️ SOLO para importar rutinas exportadas con el esquema v6 o anterior (ver routineIOApi). Nada
 * más debe usarlo: la columna `measurement_type` ya no existe en BD y la app no vuelve a hablar
 * en términos de "tipo". Un tipo desconocido cae al default, igual que hacía el import antiguo.
 * @param {string|null} legacyType
 * @returns {string[]}
 */
export function trackedFieldsFromLegacyType(legacyType) {
  return normalizeTrackedFields(LEGACY_TYPE_FIELDS[legacyType])
}

const LEGACY_TYPE_FIELDS = {
  weight_reps: [SetField.WEIGHT, SetField.REPS],
  reps_only: [SetField.REPS],
  time: [SetField.TIME],
  weight_time: [SetField.WEIGHT, SetField.TIME],
  distance: [SetField.DISTANCE],
  weight_distance: [SetField.WEIGHT, SetField.DISTANCE],
  calories: [SetField.CALORIES],
  level_time: [SetField.LEVEL, SetField.TIME],
  level_distance: [SetField.LEVEL, SetField.DISTANCE],
  level_calories: [SetField.LEVEL, SetField.CALORIES],
  distance_time: [SetField.DISTANCE, SetField.TIME],
  distance_pace: [SetField.DISTANCE, SetField.PACE],
}
