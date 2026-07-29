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

/**
 * Convierte el peso de las series de un conjunto de sesiones a una única unidad de
 * display. Usado por el overlay multi-gym del historial ("Todos los gyms"): cada sesión
 * lleva su `gymId` y sus pesos están en la unidad de ESE gym (`unitByGym[gymId]`); se
 * convierten a `displayUnit` (la del gym por defecto para el ejercicio) para que lista y
 * stats sean coherentes en una sola unidad. Redondea a 2 decimales (como `convertWeight`)
 * para no arrastrar floats crudos a stats/tabla. Sesiones cuyo gym ya está en la unidad de
 * display se devuelven sin tocar. Solo convierte `weight` (las unidades de tiempo/distancia
 * no dependen del gym). Pura.
 * @param {Array<{gymId:any, sets:Array}>|null|undefined} sessions
 * @param {Record<string,'kg'|'lb'>} unitByGym
 * @param {'kg'|'lb'} displayUnit
 * @returns {Array|null|undefined}
 */
export function convertSessionsToDisplayUnit(sessions, unitByGym, displayUnit) {
  if (!sessions) return sessions
  return sessions.map(session => {
    const srcUnit = unitByGym?.[session.gymId] || displayUnit
    if (srcUnit === displayUnit) return session
    return {
      ...session,
      sets: session.sets.map(set => {
        if (set.weight == null) return set
        const converted = convertWeightValue(set.weight, srcUnit, displayUnit)
        return { ...set, weight: Math.round(converted * 100) / 100 }
      }),
    }
  })
}
