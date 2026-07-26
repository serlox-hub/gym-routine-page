import { parseDecimal } from './numberUtils.js'

const LB_TO_KG = 0.45359237
const KG_TO_LB = 2.20462262

export function convertWeight(value, mode) {
  if (value === '' || isNaN(parseDecimal(value))) return null
  const num = parseDecimal(value)
  const result = mode === 'lb-to-kg' ? num * LB_TO_KG : num * KG_TO_LB
  return parseDecimal(result.toFixed(2))
}

export function getWeightUnits(mode) {
  return {
    from: mode === 'lb-to-kg' ? 'lb' : 'kg',
    to: mode === 'lb-to-kg' ? 'kg' : 'lb',
  }
}

export function toggleWeightMode(mode) {
  return mode === 'lb-to-kg' ? 'kg-to-lb' : 'lb-to-kg'
}

/**
 * Convierte un valor numérico de peso entre unidades. Usado para normalizar al
 * vuelo cuando se comparan datos de varios gyms con distinta unidad (overlay).
 * Devuelve el valor tal cual si no hay conversión aplicable.
 * @param {number|null|undefined} value
 * @param {'kg'|'lb'} fromUnit
 * @param {'kg'|'lb'} toUnit
 * @returns {number|null|undefined}
 */
export function convertWeightValue(value, fromUnit, toUnit) {
  if (value == null || fromUnit === toUnit) return value
  const num = Number(value)
  if (isNaN(num)) return value
  if (fromUnit === 'kg' && toUnit === 'lb') return num * KG_TO_LB
  if (fromUnit === 'lb' && toUnit === 'kg') return num * LB_TO_KG
  return value
}
