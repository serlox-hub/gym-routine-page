import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  QUERY_KEYS,
  fetchRoutines,
  fetchRoutine,
  fetchRoutineDays,
  fetchRoutineDay,
  fetchRoutineBlocks,
  fetchRoutineAllExercises,
  createRoutine,
  createRoutineDay,
  updateRoutine,
  deleteRoutine,
  deleteRoutines,
  setFavoriteRoutine,
  updateRoutineDay,
  deleteRoutineDay,
  reorderRoutineDays,
  deleteRoutineExercise,
  updateRoutineExercise,
  reorderRoutineExercises,
  addExerciseToDay,
  duplicateRoutineExercise,
  moveRoutineExerciseToDay,
} from '@gym/shared'
import { duplicateRoutine } from '../lib/routineIO.js'
import { useUserId } from './useAuth.js'

export function useRoutines() {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINES],
    queryFn: fetchRoutines,
  })
}

export function useRoutine(routineId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE, routineId],
    queryFn: () => fetchRoutine(routineId),
    enabled: !!routineId,
  })
}

export function useRoutineDays(routineId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_DAYS, routineId],
    queryFn: () => fetchRoutineDays(routineId),
    enabled: !!routineId,
  })
}

export function useRoutineDay(dayId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_DAY, dayId],
    queryFn: () => fetchRoutineDay(dayId),
    enabled: !!dayId,
  })
}

export function useRoutineBlocks(dayId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(dayId)],
    queryFn: () => fetchRoutineBlocks(dayId),
    enabled: !!dayId,
  })
}

export function useRoutineAllExercises(routineId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_ALL_EXERCISES, routineId],
    queryFn: () => fetchRoutineAllExercises(routineId),
    enabled: !!routineId,
  })
}

export function useCreateRoutine() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: (routine) => createRoutine({ userId, routine }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useCreateRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineId, day }) => createRoutineDay({ routineId, day }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineId, data }) => updateRoutine({ routineId, data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE, variables.routineId] })
    },
  })
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (routineId) => deleteRoutine(routineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useDeleteRoutines() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (routineIds) => deleteRoutines(routineIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useSetFavoriteRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineId, isFavorite }) => setFavoriteRoutine({ routineId, isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useUpdateRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ dayId, data }) => updateRoutineDay({ dayId, data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useDeleteRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ dayId }) => deleteRoutineDay(dayId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useReorderRoutineDays() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ days }) => reorderRoutineDays(days),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, variables.routineId] })
    },
  })
}

export function useDeleteRoutineExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ exerciseId }) => deleteRoutineExercise(exerciseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useUpdateRoutineExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ exerciseId, data }) => updateRoutineExercise({ exerciseId, data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useReorderRoutineExercises() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ exercises }) => reorderRoutineExercises(exercises),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useDuplicateRoutine() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ routineId, newName }) => {
      return duplicateRoutine(routineId, userId, newName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useAddExerciseToDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params) => addExerciseToDay(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useDuplicateRoutineExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineExercise }) => duplicateRoutineExercise({ routineExercise }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useMoveRoutineExerciseToDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineExercise, targetDayId, esCalentamiento = false }) =>
      moveRoutineExerciseToDay({ routineExercise, targetDayId, esCalentamiento }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.sourceDayId)] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.targetDayId)] })
    },
  })
}
