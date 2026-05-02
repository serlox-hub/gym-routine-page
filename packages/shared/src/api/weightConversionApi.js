import { getClient } from './_client.js'

const KG_TO_LB_FACTOR = 2.20462262
const LB_TO_KG_FACTOR = 0.45359237

export function getConversionFactor(fromUnit, toUnit) {
  if (fromUnit === toUnit) return 1
  if (fromUnit === 'kg' && toUnit === 'lb') return KG_TO_LB_FACTOR
  if (fromUnit === 'lb' && toUnit === 'kg') return LB_TO_KG_FACTOR
  throw new Error(`Unsupported conversion: ${fromUnit} -> ${toUnit}`)
}

export async function convertUserWeights({ scope, fromUnit, toUnit, exerciseId = null }) {
  if (fromUnit === toUnit) return

  const factor = getConversionFactor(fromUnit, toUnit)
  const params = {
    p_scope: scope,
    p_factor: factor,
    p_exercise_id: scope === 'exercise' ? exerciseId : null,
    p_old_unit: scope === 'global' ? fromUnit : null,
  }

  const { error } = await getClient().rpc('convert_user_weights', params)
  if (error) throw error
}
