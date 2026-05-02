import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { upsertPreference } from '../api/preferencesApi.js'
import { convertUserMeasurements } from '../api/measurementConversionApi.js'
import { useUserId } from './useAuth.js'

/**
 * Mutación que cambia la preferencia global de unidad de medida (cm↔in)
 * y opcionalmente convierte los body_measurements al nuevo sistema.
 *
 * @param {object} params
 * @param {'cm'|'in'} params.fromUnit
 * @param {'cm'|'in'} params.toUnit
 * @param {boolean} params.convertHistorical - si true, multiplica los valores guardados
 */
export function useChangeMeasurementUnit() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ fromUnit, toUnit, convertHistorical }) => {
      // Convertir antes de cambiar la preferencia: si la conversión falla,
      // la unidad efectiva no cambia y los datos quedan consistentes.
      if (convertHistorical && fromUnit !== toUnit) {
        await convertUserMeasurements({ fromUnit, toUnit })
      }

      await upsertPreference({ userId, key: 'measurement_unit', value: toUnit })
    },
    onSuccess: (_data, { toUnit, convertHistorical }) => {
      queryClient.setQueryData([QUERY_KEYS.USER_PREFERENCES, userId], (old) => ({
        ...(old || {}),
        measurement_unit: toUnit,
      }))

      if (convertHistorical) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY] })
      }
    },
  })
}
