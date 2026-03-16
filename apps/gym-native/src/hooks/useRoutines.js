export * from '@gym/shared'

import { duplicateRoutine, QUERY_KEYS } from '@gym/shared'
import { useUserId } from './useAuth.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useDuplicateRoutine() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ routineId, newName }) => duplicateRoutine(routineId, userId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}
