import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  fetchRoutines,
  fetchRoutine,
  fetchRoutineDays,
  fetchRoutineDay,
  fetchRoutineBlocks,
  fetchRoutineAllExercises,
  createRoutine as apiCreateRoutine,
  createRoutineDay as apiCreateRoutineDay,
  updateRoutine as apiUpdateRoutine,
  deleteRoutine as apiDeleteRoutine,
  deleteRoutines as apiDeleteRoutines,
  setFavoriteRoutine as apiSetFavoriteRoutine,
  updateRoutineDay as apiUpdateRoutineDay,
  deleteRoutineDay as apiDeleteRoutineDay,
  reorderRoutineDays as apiReorderRoutineDays,
  deleteRoutineExercise as apiDeleteRoutineExercise,
  updateRoutineExercise as apiUpdateRoutineExercise,
  reorderRoutineExercises as apiReorderRoutineExercises,
  addExerciseToDay as apiAddExerciseToDay,
  duplicateRoutineExercise as apiDuplicateRoutineExercise,
  moveRoutineExerciseToDay as apiMoveRoutineExerciseToDay,
} from '../api/routineApi.js'
import { getNotifier } from '../notifications.js'
import { t } from '../i18n/index.js'
import { useUserId } from './useAuth.js'
import { localizeExercisesInList } from '../lib/exerciseUtils.js'

export function useRoutines() {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINES],
    queryFn: fetchRoutines
  })
}

export function useRoutine(routineId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE, routineId],
    queryFn: () => fetchRoutine(routineId),
    enabled: !!routineId
  })
}

export function useRoutineDays(routineId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_DAYS, routineId],
    queryFn: () => fetchRoutineDays(routineId),
    enabled: !!routineId
  })
}

export function useRoutineDay(dayId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_DAY, dayId],
    queryFn: () => fetchRoutineDay(dayId),
    enabled: !!dayId
  })
}

export function useRoutineBlocks(dayId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(dayId)],
    queryFn: () => fetchRoutineBlocks(dayId),
    select: localizeExercisesInList,
    enabled: !!dayId
  })
}

/**
 * Obtiene todos los ejercicios de una rutina (de todos los dias)
 * Util para detectar ejercicios duplicados al anadir uno nuevo
 */
export function useRoutineAllExercises(routineId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_ALL_EXERCISES, routineId],
    queryFn: () => fetchRoutineAllExercises(routineId),
    enabled: !!routineId
  })
}

export function useCreateRoutine() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: (routine) => apiCreateRoutine({ userId, routine }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      getNotifier()?.show(t('routine:created'), 'success')
    },
  })
}

export function useCreateRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineId, day }) => apiCreateRoutineDay({ routineId, day }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineId, data }) => apiUpdateRoutine({ routineId, data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE, String(variables.routineId)] })
    },
  })
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (routineId) => apiDeleteRoutine(routineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      getNotifier()?.show(t('routine:deleted'), 'success')
    },
  })
}

export function useDeleteRoutines() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (routineIds) => apiDeleteRoutines(routineIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useSetFavoriteRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineId, isFavorite }) => apiSetFavoriteRoutine({ routineId, isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useUpdateRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ dayId, data }) => apiUpdateRoutineDay({ dayId, data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useDeleteRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ dayId }) => apiDeleteRoutineDay(dayId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useReorderRoutineDays() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ days }) => apiReorderRoutineDays(days),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useDeleteRoutineExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ exerciseId }) => apiDeleteRoutineExercise(exerciseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useUpdateRoutineExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ exerciseId, data }) => apiUpdateRoutineExercise({ exerciseId, data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useReorderRoutineExercises() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ exercises }) => apiReorderRoutineExercises(exercises),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

// useDuplicateRoutine queda per-app: exportRoutine/importRoutine usan supabase directo y no estan en shared

export function useAddExerciseToDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params) => apiAddExerciseToDay(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useDuplicateRoutineExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineExercise }) => apiDuplicateRoutineExercise({ routineExercise }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useMoveRoutineExerciseToDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineExercise, targetDayId, esCalentamiento }) =>
      apiMoveRoutineExerciseToDay({ routineExercise, targetDayId, esCalentamiento }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.sourceDayId)] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.targetDayId)] })
    },
  })
}

// ============================================
// HELPERS
// ============================================

const DEBOUNCE_MS = 500

export function useRoutineEditForm(routine, routineId) {
  const [editForm, setEditForm] = useState({ name: '', description: '', goal: '', cycle_days: 7 })
  const debounceRef = useRef(null)
  const updateRoutine = useUpdateRoutine()

  useEffect(() => {
    if (routine) {
      setEditForm({
        name: routine.name || '',
        description: routine.description || '',
        goal: routine.goal || '',
        cycle_days: routine.cycle_days || 7,
      })
    }
  }, [routine])

  const saveChanges = useCallback((formData) => {
    if (!formData.name.trim()) return
    updateRoutine.mutate({
      routineId: parseInt(routineId),
      data: {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        goal: formData.goal.trim() || null,
        cycle_days: parseInt(formData.cycle_days) || 7,
      },
    })
  }, [routineId, updateRoutine])

  const handleFieldChange = (field, value) => {
    const newForm = { ...editForm, [field]: value }
    setEditForm(newForm)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveChanges(newForm), DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return { editForm, handleFieldChange }
}
