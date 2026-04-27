import { getClient } from './_client.js'

const CM_TO_IN_FACTOR = 0.39370079
const IN_TO_CM_FACTOR = 2.54

export function getMeasurementConversionFactor(fromUnit, toUnit) {
  if (fromUnit === toUnit) return 1
  if (fromUnit === 'cm' && toUnit === 'in') return CM_TO_IN_FACTOR
  if (fromUnit === 'in' && toUnit === 'cm') return IN_TO_CM_FACTOR
  throw new Error(`Unsupported measurement conversion: ${fromUnit} -> ${toUnit}`)
}

export async function convertUserMeasurements({ fromUnit, toUnit }) {
  if (fromUnit === toUnit) return

  const factor = getMeasurementConversionFactor(fromUnit, toUnit)
  const { error } = await getClient().rpc('convert_user_measurements', {
    p_factor: factor,
  })
  if (error) throw error
}
