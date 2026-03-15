export * from '@gym/shared'

// useDuplicateRoutine se queda local porque duplicateRoutine usa supabase directo
import { duplicateRoutine } from '../lib/routineIO.js'
import { useUserId } from './useAuth.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@gym/shared'

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
