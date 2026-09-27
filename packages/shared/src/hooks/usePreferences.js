import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchPreferences, upsertPreference } from '../api/preferencesApi.js'
import { useUserId } from './useAuth.js'
import { i18n, t } from '../i18n/index.js'
import { getNotifier } from '../notifications.js'

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

// Una sola cola para todas las preferencias (issue #99): TanStack Query no lanza una mutación del
// mismo scope hasta que acaba la anterior, así que las escrituras llegan al servidor en orden. Sin
// ella, si la segunda llega antes, la BD se queda con la primera (p. ej. la lista de semanas de
// descanso sin la segunda semana).
const PREFERENCES_SCOPE = 'user-preferences'

/**
 * Guarda una preferencia con update optimista: la caché cambia al instante, así que un segundo
 * toque lee ya el valor nuevo (las listas como `training_rest_weeks` se calculan con la caché y se
 * guardan enteras).
 *
 * `onMutate` corre al llamar a `mutate`, NO al salir de la cola: con dos escrituras seguidas, la
 * segunda ya ha pintado su valor cuando la primera responde. Por eso el rollback solo deshace si
 * la caché sigue teniendo el valor de ESA escritura, y el éxito no escribe nada (pisaría el de la
 * siguiente). Cuando acaba la última escritura de la cola se vuelve a pedir la lista al servidor,
 * que es lo que deja la caché igual que la BD pase lo que pase en medio.
 */
export function useUpdatePreference() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  const queryKey = [QUERY_KEYS.USER_PREFERENCES, userId]

  return useMutation({
    mutationKey: [PREFERENCES_SCOPE],
    scope: { id: PREFERENCES_SCOPE },
    // Sin red falla al momento (rollback + toast) en vez de quedarse en pausa: con 'online' la UI
    // mostraría el cambio como guardado y se perdería al cerrar la pestaña sin avisar
    networkMode: 'always',
    mutationFn: (params) => upsertPreference({ userId, ...params }),
    onMutate: async ({ key, value }) => {
      // Un refresco en vuelo llegaría después con el valor viejo y desharía el optimista
      await queryClient.cancelQueries({ queryKey })
      const current = queryClient.getQueryData(queryKey)
      // Sin caché (la carga falló o no ha llegado) no se escribe un objeto con una sola clave: la
      // query pasaría a éxito con el resto en sus defaults, y la tarjeta de racha le ofrecería
      // configurar el objetivo a quien ya lo tiene (issue #98). La recarga de `onSettled` la trae.
      if (current === undefined) return { applied: false }
      // Se guarda la referencia que acabó en caché, no `value`: el structural sharing copia los
      // arrays que cambian, y comparar con `value` no casaría nunca en `training_rest_weeks`
      const written = queryClient.setQueryData(queryKey, { ...current, [key]: value })[key]
      return { applied: true, previous: current[key], written }
    },
    onError: (_error, { key }, context) => {
      if (context?.applied) {
        queryClient.setQueryData(queryKey, (old) =>
          old && old[key] === context.written ? { ...old, [key]: context.previous } : old
        )
      }
      getNotifier()?.show(t('common:errors.preferenceSave'), 'error')
    },
    onSettled: () => {
      // La mutación sigue contando como en curso dentro de su propio onSettled: 1 = era la última
      if (queryClient.isMutating({ mutationKey: [PREFERENCES_SCOPE] }) === 1) {
        queryClient.invalidateQueries({ queryKey })
      }
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
