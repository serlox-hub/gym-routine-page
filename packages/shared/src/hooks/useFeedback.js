import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  createFeedback,
  fetchAllFeedback,
  setFeedbackResolved,
  deleteFeedback,
} from '../api/feedbackApi.js'
import { useUserId } from './useAuth.js'

// ============================================
// QUERIES
// ============================================

export function useAllFeedback() {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_FEEDBACK],
    queryFn: fetchAllFeedback,
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useCreateFeedback() {
  const userId = useUserId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ type, message, appVersion, platform }) =>
      createFeedback({ userId, type, message, appVersion, platform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_FEEDBACK] })
    },
  })
}

export function useSetFeedbackResolved() {
  const adminId = useUserId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, resolved }) => setFeedbackResolved({ id, resolved, adminId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_FEEDBACK] })
    },
  })
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => deleteFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_FEEDBACK] })
    },
  })
}
