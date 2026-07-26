import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { upsertPreference } from '../api/preferencesApi.js'
import { upsertUserExerciseGymUnit } from '../api/exerciseApi.js'
import { convertUserWeights } from '../api/weightConversionApi.js'
import { useUserId } from './useAuth.js'

const HISTORICAL_QUERY_KEYS = [
  QUERY_KEYS.COMPLETED_SETS,
  QUERY_KEYS.PREVIOUS_WORKOUT,
  QUERY_KEYS.WORKOUT_HISTORY,
  QUERY_KEYS.SESSION_DETAIL,
  QUERY_KEYS.EXERCISE_HISTORY,
  QUERY_KEYS.WEEKLY_SESSION_STATS,
  QUERY_KEYS.WEEKLY_PR_COUNT,
]

const BODY_WEIGHT_QUERY_KEYS = [
  QUERY_KEYS.BODY_WEIGHT_HISTORY,
  QUERY_KEYS.BODY_WEIGHT_LATEST,
]

/**
 * Mutación que cambia la unidad (preferencia global o override por ejercicio)
 * y opcionalmente convierte los datos históricos al nuevo sistema.
 *
 * @param {object} params
 * @param {'global'|'exercise'} params.scope
 * @param {number} [params.exerciseId] - requerido si scope='exercise'
 * @param {number} [params.gymId] - gimnasio activo, requerido si scope='exercise'
 * @param {'kg'|'lb'} params.fromUnit - unidad efectiva actual
 * @param {'kg'|'lb'} params.toUnit - unidad efectiva nueva
 * @param {boolean} params.convertHistorical - si true, multiplica los pesos guardados por el factor
 * @param {string|null} [params.overrideValue] - unidad a guardar en user_exercise_gym_units
 *   (null = "heredar la global", borra la fila). Solo aplica si scope='exercise'.
 */
export function useChangeWeightUnit() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ scope, exerciseId, gymId, fromUnit, toUnit, convertHistorical, overrideValue }) => {
      // Convertir antes de cambiar la preferencia/unidad: si la conversión falla,
      // la unidad efectiva no cambia y los datos quedan consistentes.
      if (convertHistorical && fromUnit !== toUnit) {
        await convertUserWeights({ scope, fromUnit, toUnit, exerciseId, gymId })
      }

      if (scope === 'global') {
        await upsertPreference({ userId, key: 'weight_unit', value: toUnit })
      } else if (scope === 'exercise') {
        // La unidad vive por (ejercicio, gym): solo toca el gym activo.
        await upsertUserExerciseGymUnit({ userId, exerciseId, gymId, weightUnit: overrideValue ?? null })
      }
    },
    onSuccess: (_data, { scope, exerciseId, gymId, toUnit, convertHistorical }) => {
      if (scope === 'global') {
        queryClient.setQueryData([QUERY_KEYS.USER_PREFERENCES, userId], (old) => ({
          ...(old || {}),
          weight_unit: toUnit,
        }))
      } else if (scope === 'exercise') {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES, 'gym-unit', exerciseId, gymId ?? null] })
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES, 'units-by-gym', exerciseId] })
      }

      if (convertHistorical) {
        for (const key of HISTORICAL_QUERY_KEYS) {
          queryClient.invalidateQueries({ queryKey: [key] })
        }
        if (scope === 'global') {
          for (const key of BODY_WEIGHT_QUERY_KEYS) {
            queryClient.invalidateQueries({ queryKey: [key] })
          }
        }
      }
    },
  })
}
