import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { useUserId } from './useAuth.js'

// Valores por defecto para cada preferencia
const DEFAULT_VALUES = {
  show_rir_input: true,
  show_set_notes: true,
  show_session_notes: true,
  show_video_upload: true,
  enabled_body_measurements: [],
  measurement_unit: 'cm',
}

// ============================================
// QUERIES
// ============================================

export function usePreferences() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.USER_PREFERENCES, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('key, value')
        .eq('user_id', userId)

      if (error) throw error

      // Convertir array de {key, value} a objeto
      const prefs = { ...DEFAULT_VALUES }
      data?.forEach(row => {
        prefs[row.key] = row.value
      })
      return prefs
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useUpdatePreference() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ key, value }) => {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: userId, key, value },
          { onConflict: 'user_id,key' }
        )

      if (error) throw error
      return { key, value }
    },
    onSuccess: ({ key, value }) => {
      // Actualizar cache
      queryClient.setQueryData([QUERY_KEYS.USER_PREFERENCES, userId], (old) => ({
        ...old,
        [key]: value,
      }))
    },
  })
}

// ============================================
// HELPERS
// ============================================

// Hook simplificado para leer una preferencia específica
export function usePreference(key) {
  const { data: preferences, isLoading } = usePreferences()
  return {
    value: preferences?.[key] ?? DEFAULT_VALUES[key],
    isLoading,
  }
}
