import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  fetchSessionExercises,
  addSessionExercise,
  replaceSessionExercise,
  updateSessionExerciseFields,
  deleteSessionExercise,
  reorderSessionExercises,
} from '../api/workoutApi.js'
import { useWorkoutStore } from './_stores.js'
import { localizeExercisesInList } from '../lib/exerciseUtils.js'
import { applyExerciseOrder } from '../lib/routineDayLayout.js'
import { buildReplaceSessionExerciseFields, pickSessionExerciseFields } from '../lib/sessionExerciseUtils.js'
import { resolveTrackedFields } from '../lib/measurementFields.js'
import { getNotifier } from '../notifications.js'
import { t } from '../i18n/index.js'

// ============================================
// SESSION EXERCISES QUERIES & MUTATIONS
// ============================================

// Cachés de rutina que cambian cuando la sesión escribe en su fila de rutina (editar propaga,
// reemplazar "también en la rutina"). Una sola lista: copiada en cada hook, se olvidó
// ROUTINE_BLOCKS (los ejercicios de cada día) y el detalle de la rutina se quedaba viejo.
function invalidateRoutineExerciseCaches(queryClient) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS] })
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAY] })
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS] })
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_ALL_EXERCISES] })
}

export function useSessionExercises(sessionId) {
  return useQuery({
    queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId],
    queryFn: () => fetchSessionExercises(sessionId),
    select: localizeExercisesInList,
    enabled: !!sessionId,
  })
}

// Takes the add form's payload (`exercise`, the parsed fields, `superset_group`) plus `addToRoutine`.
export function useAddSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  return useMutation({
    mutationFn: (data) => addSessionExercise({
      sessionId,
      exerciseId: data.exercise.id,
      fields: pickSessionExerciseFields(data),
      supersetGroup: data.superset_group,
      addToRoutine: data.addToRoutine,
    }),
    onSuccess: (result, { addToRoutine }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
      if (result?.routine_exercise_id != null) {
        invalidateRoutineExerciseCaches(queryClient)
        // The routine card shows `exercises_count` (`fetchRoutines`): adding is the only session
        // write that changes it, so it is not in the shared list above.
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      } else if (addToRoutine) {
        getNotifier()?.show(t('workout:exercise.addRoutineDayGone'), 'info')
      }
    },
    onError: () => {
      getNotifier()?.show(t('workout:exercise.addFailed'), 'error')
    },
  })
}

export function useReplaceSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const clearExercise = useWorkoutStore(state => state.clearExercise)

  return useMutation({
    mutationFn: async ({ sessionExerciseId, newExercise, applyToRoutine }) => {
      // La fila saliente se lee de la caché de la sesión: de ella sale el objetivo a adaptar.
      const rows = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId]) ?? []
      const current = rows.find(row => String(row.id) === String(sessionExerciseId))
      if (!current) throw new Error('session_exercise_not_found')

      const fields = buildReplaceSessionExerciseFields(
        current,
        resolveTrackedFields(newExercise),
        resolveTrackedFields(current.exercise)
      )
      await replaceSessionExercise({ sessionExerciseId, newExerciseId: newExercise.id, fields, applyToRoutine })
    },
    onSuccess: (_, { sessionExerciseId, applyToRoutine }) => {
      clearExercise(sessionExerciseId)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
      if (applyToRoutine) invalidateRoutineExerciseCaches(queryClient)
    },
    onError: () => {
      getNotifier()?.show(t('workout:exercise.replaceFailed'), 'error')
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
  const queryKey = [QUERY_KEYS.SESSION_EXERCISES, sessionId]

  return useMutation({
    mutationFn: ({ sessionExerciseId, fields }) => {
      return updateSessionExerciseFields(sessionExerciseId, fields, { propagateToRoutine: true })
    },
    onMutate: async ({ sessionExerciseId, fields }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old
        return old.map(item => item.id === sessionExerciseId ? { ...item, ...fields } : item)
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      getNotifier()?.show(t('workout:exercise.updateFailed'), 'error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      invalidateRoutineExerciseCaches(queryClient)
    },
  })
}

// Takes `reorderSessionExercises` items: the whole session, warm-up first, with `supersetGroup` on
// the rows whose membership changes. Session only: nothing here touches the routine.
export function useReorderSessionExercises() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const queryKey = [QUERY_KEYS.SESSION_EXERCISES, sessionId]

  return useMutation({
    mutationFn: (items) => reorderSessionExercises(items),
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, old => applyExerciseOrder(old, items))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      getNotifier()?.show(t('workout:exercise.reorderFailed'), 'error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}
