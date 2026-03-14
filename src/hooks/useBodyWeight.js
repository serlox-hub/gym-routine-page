import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { useUserId } from './useAuth.js'
import {
  fetchBodyWeightHistory,
  fetchLatestBodyWeight,
  createBodyWeight,
  updateBodyWeight,
  deleteBodyWeight,
} from '../lib/api/bodyWeightApi.js'

// ============================================
// QUERIES
// ============================================

export function useBodyWeightHistory() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.BODY_WEIGHT_HISTORY, userId],
    queryFn: () => fetchBodyWeightHistory(userId),
    enabled: !!userId,
  })
}

export function useLatestBodyWeight() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.BODY_WEIGHT_LATEST, userId],
    queryFn: () => fetchLatestBodyWeight(userId),
    enabled: !!userId,
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useRecordBodyWeight() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: (params) => createBodyWeight({ userId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_LATEST] })
    },
  })
}

export function useUpdateBodyWeight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBodyWeight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_LATEST] })
    },
  })
}

export function useDeleteBodyWeight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBodyWeight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_LATEST] })
    },
  })
}
