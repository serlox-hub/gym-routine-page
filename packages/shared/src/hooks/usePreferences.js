import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchPreferences, upsertPreference } from '../api/preferencesApi.js'
import { useUserId } from './useAuth.js'
import { i18n } from '../i18n/index.js'

const DEFAULT_VALUES = {
  show_rir_input: true,
  show_set_notes: true,
  show_session_notes: true,
  show_video_upload: true,
  show_set_type: true,
  progression_suggestions: true,
  weight_unit: 'kg',
  enabled_body_measurements: [],
  measurement_unit: 'cm',
  training_days_per_week: null,
  training_cycle_length: 7,
  training_rest_weeks: [],
  show_training_goal: true,
  week_start_day: 'monday',
  language: 'es',
  body_weight_reminder_days: 0,
  body_measurements_reminder_days: 0,
  onboarding_completed: false,
}

// ============================================
// QUERIES
// ============================================

export function usePreferences() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.USER_PREFERENCES, userId],
    queryFn: async () => {
      const data = await fetchPreferences(userId)
      const prefs = { ...DEFAULT_VALUES }
      data?.forEach(row => {
        prefs[row.key] = row.value
      })
      return prefs
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useUpdatePreference() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: (params) => upsertPreference({ userId, ...params }),
    onSuccess: ({ key, value }) => {
      const queryKey = [QUERY_KEYS.USER_PREFERENCES, userId]
      // Sin caché (la carga falló o no ha llegado) no se escribe un objeto con una sola clave: la
      // query pasaría a éxito con el resto en sus defaults, y la tarjeta de racha le ofrecería
      // configurar el objetivo a quien ya lo tiene (issue #98). Se vuelve a pedir entero.
      if (queryClient.getQueryData(queryKey) === undefined) {
        queryClient.invalidateQueries({ queryKey })
        return
      }
      queryClient.setQueryData(queryKey, (old) => ({ ...old, [key]: value }))
    },
  })
}

// ============================================
// HELPERS
// ============================================

// Con `isError`, `value` es el valor por defecto, no el del usuario: quien decida algo con él tiene
// que mirar antes `isError` (ver `useTrainingGoal`). Solo cuenta sin datos: si falla un refresco en
// segundo plano, la caché sigue siendo la del usuario y el valor vale.
export function usePreference(key) {
  const { data: preferences, isLoading, isError, refetch } = usePreferences()
  return {
    value: preferences?.[key] ?? DEFAULT_VALUES[key],
    isLoading,
    isError: isError && !preferences,
    refetch,
  }
}

export function useLanguageSync() {
  const { data: preferences } = usePreferences()
  const language = preferences?.language

  useEffect(() => {
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language)
    }
  }, [language])
}
