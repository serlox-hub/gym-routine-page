import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchPreferences, upsertPreference } from '../api/preferencesApi.js'
import { useUserId } from './useAuth.js'

const DEFAULT_VALUES = {
  show_rir_input: true,
  show_set_notes: true,
  show_session_notes: true,
  show_video_upload: true,
  enabled_body_measurements: [],
  measurement_unit: 'cm',
  training_days_per_week: null,
  training_cycle_length: 7,
  training_rest_weeks: [],
  show_training_goal: true,
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

export function usePreference(key) {
  const { data: preferences, isLoading } = usePreferences()
  return {
    value: preferences?.[key] ?? DEFAULT_VALUES[key],
    isLoading,
  }
}
