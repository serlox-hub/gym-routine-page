import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  QUERY_KEYS,
  fetchSessionExercises,
  addSessionExercise,
  deleteCompletedSetsByExercise,
  updateSessionExerciseExerciseId,
  updateSessionExerciseFields,
  deleteSessionExercise,
  reorderSessionExercises,
} from '@gym/shared'
import useWorkoutStore from '../stores/workoutStore.js'

// ============================================
// SESSION EXERCISES QUERIES & MUTATIONS
// ============================================

export function useSessionExercises(sessionId) {
  return useQuery({
    queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId],
    queryFn: () => fetchSessionExercises(sessionId),
    enabled: !!sessionId,
  })
}

export function useAddSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  return useMutation({
    mutationFn: async ({ exercise, series, reps, rir, rest_seconds, notes, tempo, superset_group }) => {
      return addSessionExercise({ sessionId, exercise, series, reps, rir, rest_seconds, notes, tempo, superset_group })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
    },
  })
}

export function useReplaceSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const clearExercise = useWorkoutStore(state => state.clearExercise)

  return useMutation({
    mutationFn: async ({ sessionExerciseId, newExerciseId }) => {
      await deleteCompletedSetsByExercise({ sessionId, sessionExerciseId })
      return updateSessionExerciseExerciseId({ sessionExerciseId, newExerciseId })
    },
    onSuccess: (_, { sessionExerciseId }) => {
      clearExercise(sessionExerciseId)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}

export function useRemoveSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const clearExerciseFromStore = useWorkoutStore(state => state.clearExercise)

  return useMutation({
    mutationFn: async (sessionExerciseId) => {
      await deleteSessionExercise(sessionExerciseId)
    },
    onSuccess: (_, sessionExerciseId) => {
      clearExerciseFromStore(sessionExerciseId)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}

export function useUpdateSessionExerciseFields() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  return useMutation({
    mutationFn: ({ sessionExerciseId, fields }) => {
      return updateSessionExerciseFields(sessionExerciseId, fields)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
    },
  })
}

export function useReorderSessionExercises() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  return useMutation({
    mutationFn: async (orderedExerciseIds) => {
      await reorderSessionExercises(orderedExerciseIds)
    },
    onMutate: async (orderedExerciseIds) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
      const previous = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId])
      queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId], (old) => {
        if (!old) return old
        const orderMap = Object.fromEntries(orderedExerciseIds.map((id, i) => [id, i + 1]))
        return [...old]
          .map(item => ({ ...item, sort_order: orderMap[item.id] ?? item.sort_order }))
          .sort((a, b) => a.sort_order - b.sort_order)
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
    },
  })
}
