import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchAllUsers, updateUserSetting as apiUpdateUserSetting } from '../api/adminApi.js'

// ============================================
// QUERIES
// ============================================

export function useAllUsers() {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_USERS],
    queryFn: fetchAllUsers,
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useUpdateUserSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, key, value }) => apiUpdateUserSetting({ userId, key, value }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_USERS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_SETTINGS, userId] })
    },
  })
}
