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
