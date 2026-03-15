import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@gym/shared'
import { useUserId } from './useAuth.js'
import {
  fetchExercisesWithMuscleGroup,
  fetchMuscleGroups,
  fetchExerciseStats,
  fetchExerciseUsageDetail,
  fetchExercise,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../lib/api/exerciseApi.js'

export function useExercisesWithMuscleGroup() {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, 'with-muscle-group'],
    queryFn: fetchExercisesWithMuscleGroup,
  })
}

export function useMuscleGroups() {
  return useQuery({
    queryKey: ['muscle-groups'],
    queryFn: fetchMuscleGroups,
  })
}

export function useExerciseStats() {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_USAGE_COUNTS],
    queryFn: fetchExerciseStats,
  })
}

export function useExerciseUsageDetail(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_USAGE_DETAIL, exerciseId],
    queryFn: () => fetchExerciseUsageDetail(exerciseId),
    enabled: !!exerciseId,
  })
}

export function useExercise(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, exerciseId],
    queryFn: () => fetchExercise(exerciseId),
    enabled: !!exerciseId,
  })
}

export function useCreateExercise() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: (params) => createExercise({ userId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
    },
  })
}

export function useUpdateExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateExercise,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES, data.id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_ALL_EXERCISES] })
    },
  })
}

export function useDeleteExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
    },
  })
}
