import {
  getFieldHeader,
  getFieldMeta,
  getFieldUnit,
  normalizeTrackedFields,
} from './measurementFields.js'
import { toNullableFloat, toNullableInt } from './numberUtils.js'

/**
 * Columnas de valor de la fila de serie, a partir de los campos que mide el ejercicio. Fuente
 * ÚNICA para web y native: decide cuántas columnas tiene el grid (SERIE · [valores] · NOTAS · ✓),
 * qué cabecera lleva cada una y qué campo del estado edita.
 *
 * Que la unidad viva en la CABECERA (y no como etiqueta dentro de la fila) es lo que permite que
 * cualquier combinación de campos quepa en el mismo grid columnar: en la fila solo hay inputs,
 * que encogen. Ver docs/DECISIONS.md.
 */

/**
 * @param {string[]|null} trackedFields
 * @param {{weightUnit?: string, distanceUnit?: string}} [units]
 * @returns {Array<{field: string, label: string, unit: string, decimal: boolean}>} 1 a 3 columnas
 */
export function getSetColumns(trackedFields, { weightUnit = 'kg', distanceUnit = 'm' } = {}) {
  return normalizeTrackedFields(trackedFields).map(field => ({
    field,
    label: getFieldHeader(field, { weightUnit, distanceUnit }),
    unit: getFieldUnit(field, { weightUnit, distanceUnit }),
    decimal: getFieldMeta(field).decimal,
  }))
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
    const raw = set?.[getFieldMeta(field).column]
    values[field] = raw == null ? '' : raw
  })
  return values
}

/**
 * Campos de medición para el payload de `upsertCompletedSet`. Solo incluye los que mide el
 * ejercicio: las columnas ausentes del payload NO se tocan en el upsert (un peso en un ejercicio
 * de nivel seguiría intacto en vez de irse a null).
 * @param {Object<string, string|number>} values
 * @param {Array<{field: string}>} columns - salida de getSetColumns
 * @returns {Object} claves camelCase de upsertCompletedSet
 */
export function buildSetFieldsPayload(values, columns) {
  const payload = {}
  columns.forEach(({ field }) => {
    const { payloadKey, decimal } = getFieldMeta(field)
    payload[payloadKey] = decimal ? toNullableFloat(values[field]) : toNullableInt(values[field])
  })
  return payload
}
