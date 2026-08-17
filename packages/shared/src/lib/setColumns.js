import { t } from '../i18n/index.js'
import { MeasurementType, withDefaultMeasurementType } from './measurementTypes.js'
import { toNullableFloat, toNullableInt } from './numberUtils.js'

/**
 * Columnas de valor de la fila de serie, por tipo de medición. Fuente ÚNICA para web y native:
 * decide cuántas columnas tiene el grid (SERIE · ANTERIOR · [valores] · NOTAS · ✓), qué cabecera
 * lleva cada una y qué campo del estado edita.
 *
 * Que la unidad viva en la CABECERA (y no como etiqueta dentro de la fila) es lo que permite que
 * todos los tipos quepan en el mismo grid columnar: en la fila solo hay inputs, que encogen.
 * Ver docs/DECISIONS.md.
 */

export const SetField = {
  WEIGHT: 'weight',
  REPS: 'reps',
  TIME: 'time',
  DISTANCE: 'distance',
  CALORIES: 'calories',
  LEVEL: 'level',
  PACE: 'pace',
}

const FIELDS_BY_TYPE = {
  [MeasurementType.WEIGHT_REPS]: [SetField.WEIGHT, SetField.REPS],
  [MeasurementType.REPS_ONLY]: [SetField.REPS],
  [MeasurementType.TIME]: [SetField.TIME],
  [MeasurementType.WEIGHT_TIME]: [SetField.WEIGHT, SetField.TIME],
  [MeasurementType.DISTANCE]: [SetField.DISTANCE],
  [MeasurementType.WEIGHT_DISTANCE]: [SetField.WEIGHT, SetField.DISTANCE],
  [MeasurementType.CALORIES]: [SetField.CALORIES],
  [MeasurementType.LEVEL_TIME]: [SetField.LEVEL, SetField.TIME],
  [MeasurementType.LEVEL_DISTANCE]: [SetField.LEVEL, SetField.DISTANCE],
  [MeasurementType.LEVEL_CALORIES]: [SetField.LEVEL, SetField.CALORIES],
  [MeasurementType.DISTANCE_TIME]: [SetField.DISTANCE, SetField.TIME],
  [MeasurementType.DISTANCE_PACE]: [SetField.DISTANCE, SetField.PACE],
}

// Campos con decimales (el resto son enteros): cambia el teclado en móvil, no la validación.
const DECIMAL_FIELDS = [SetField.WEIGHT, SetField.DISTANCE]

// Cabeceras cortas a propósito: la columna mide ~35-60px en móvil. "MM:SS" además comunica el
// formato del input de duración (ver durationInput.js).
function getFieldLabel(field, { weightUnit, distanceUnit }) {
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

// Unidad para pantallas SIN cabecera de columna (edición desde el historial): va pegada al input.
// En tiempo es "min", no "MM:SS": ahí no describe el formato, dice en qué unidad está el valor
// ("24:00" a secas se lee como horas tan fácil como como minutos).
function getFieldUnit(field, { weightUnit, distanceUnit }) {
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

/**
 * @param {string|null} measurementType
 * @param {{weightUnit?: string, distanceUnit?: string}} [units]
 * @returns {Array<{field: string, label: string, unit: string, decimal: boolean}>} 1 o 2 columnas
 */
export function getSetColumns(measurementType, { weightUnit = 'kg', distanceUnit = 'm' } = {}) {
  const fields = FIELDS_BY_TYPE[withDefaultMeasurementType(measurementType)]
    ?? FIELDS_BY_TYPE[MeasurementType.WEIGHT_REPS]
  return fields.map(field => ({
    field,
    label: getFieldLabel(field, { weightUnit, distanceUnit }),
    unit: getFieldUnit(field, { weightUnit, distanceUnit }),
    decimal: DECIMAL_FIELDS.includes(field),
  }))
}

// Dónde vive cada campo: columna de `completed_sets` (fila leída) y clave del payload de
// `upsertCompletedSet` (escritura). Los pares no coinciden en nombre, así que el mapa evita
// que cada pantalla se lo invente (era justo lo que faltaba en la edición desde el historial:
// solo conocía peso/reps/tiempo/distancia, así que nivel, kcal y ritmo no se podían editar).
const FIELD_STORAGE = {
  [SetField.WEIGHT]: { column: 'weight', payloadKey: 'weight', decimal: true },
  [SetField.REPS]: { column: 'reps_completed', payloadKey: 'repsCompleted' },
  [SetField.TIME]: { column: 'time_seconds', payloadKey: 'timeSeconds' },
  [SetField.DISTANCE]: { column: 'distance_meters', payloadKey: 'distanceMeters', decimal: true },
  [SetField.CALORIES]: { column: 'calories_burned', payloadKey: 'caloriesBurned' },
  [SetField.LEVEL]: { column: 'level', payloadKey: 'level' },
  [SetField.PACE]: { column: 'pace_seconds', payloadKey: 'paceSeconds' },
}

/**
 * Valores de los inputs a partir de una fila guardada de `completed_sets` (snake_case).
 * @param {object} set - fila de completed_sets
 * @param {Array<{field: string}>} columns - salida de getSetColumns
 * @returns {Object<string, string|number>} vacío = '' (nunca null, para inputs controlados)
 */
export function getSetFieldValues(set, columns) {
  const values = {}
  columns.forEach(({ field }) => {
    const raw = set?.[FIELD_STORAGE[field].column]
    values[field] = raw == null ? '' : raw
  })
  return values
}

/**
 * Campos de medición para el payload de `upsertCompletedSet`. Solo incluye los del tipo: las
 * columnas ausentes del payload NO se tocan en el upsert (un peso en un ejercicio de nivel
 * seguiría intacto en vez de irse a null).
 * @param {Object<string, string|number>} values
 * @param {Array<{field: string}>} columns - salida de getSetColumns
 * @returns {Object} claves camelCase de upsertCompletedSet
 */
export function buildSetFieldsPayload(values, columns) {
  const payload = {}
  columns.forEach(({ field }) => {
    const { payloadKey, decimal } = FIELD_STORAGE[field]
    payload[payloadKey] = decimal ? toNullableFloat(values[field]) : toNullableInt(values[field])
  })
  return payload
}
