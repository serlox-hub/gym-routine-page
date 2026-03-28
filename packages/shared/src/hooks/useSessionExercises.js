import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  fetchSessionExercises,
  fetchSessionExercisesSortOrder,
  fetchSessionExerciseBlockName,
  updateSessionExerciseSortOrder,
  insertSessionExercise,
  deleteCompletedSetsByExercise,
  updateSessionExerciseExerciseId,
  updateSessionExerciseFields,
  deleteSessionExercise,
  reorderSessionExercises,
} from '../api/workoutApi.js'
import { useWorkoutStore } from './_stores.js'

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
      // Obtener todos los ejercicios de la sesion para calcular posicion
      const existing = await fetchSessionExercisesSortOrder(sessionId)

      let insertSortOrder
      let blockName = 'Principal'

      if (superset_group && existing?.length) {
        // Si se asigna a un superset, insertar despues del ultimo ejercicio del superset
        const supersetExercises = existing.filter(e => e.superset_group === superset_group)

        if (supersetExercises.length > 0) {
          // Encontrar la posicion del ultimo ejercicio del superset
          const lastSupersetExercise = supersetExercises[supersetExercises.length - 1]
          insertSortOrder = lastSupersetExercise.sort_order + 1

          // Usar el mismo bloque que el superset (buscar en existing)
          const supersetMember = existing.find(e => e.superset_group === superset_group)
          if (supersetMember) {
            const memberBlockName = await fetchSessionExerciseBlockName(supersetMember.id)
            if (memberBlockName) {
              blockName = memberBlockName
            }
          }

          // Desplazar los ejercicios posteriores
          const exercisesToShift = existing.filter(e => e.sort_order >= insertSortOrder)
          if (exercisesToShift.length > 0) {
            await Promise.all(
              exercisesToShift.map(e => updateSessionExerciseSortOrder(e.id, e.sort_order + 1))
            )
          }
        } else {
          // Superset nuevo, anadir al final
          insertSortOrder = (existing[existing.length - 1]?.sort_order || 0) + 1
        }
      } else {
        // Sin superset, anadir al final
        insertSortOrder = (existing?.[existing.length - 1]?.sort_order || 0) + 1
      }

      return insertSessionExercise({
        sessionId,
        exerciseId: exercise.id,
        sortOrder: insertSortOrder,
        series: series || 3,
        reps: reps || '10',
        rir,
        restSeconds: rest_seconds,
        tempo,
        notes,
        supersetGroup: superset_group,
        blockName,
      })
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
      // Eliminar series completadas del ejercicio anterior
      await deleteCompletedSetsByExercise({ sessionId, sessionExerciseId })

      // Actualizar el exercise_id y limpiar campos específicos del anterior
      await updateSessionExerciseExerciseId({ sessionExerciseId, newExerciseId })
      return updateSessionExerciseFields(sessionExerciseId, { rir: null, tempo: null, notes: null })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
    },
  })
}
