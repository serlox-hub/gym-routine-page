import { useState, useRef, useEffect, useCallback } from 'react'
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
// The failure toast stays in the hook-level `onError` on purpose: it still runs after the screen
// unmounts, while callbacks passed to `mutate()` are dropped. `shouldToastError` returning false
// skips it, for a failure the screen is already showing inline.
/** @param {{ shouldToastError?: (error: Error, variables: object) => boolean }} [options] */
export function useAddSessionExercise({ shouldToastError } = {}) {
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
    onError: (error, variables) => {
      if (shouldToastError && !shouldToastError(error, variables)) return
      getNotifier()?.show(t('workout:exercise.addFailed'), 'error')
    },
  })
}

/**
 * The add started from the dialog or modal that is open now (its "own attempt"), on top of the
 * screen-wide add mutation. That mutation's state carries over from one add to the next, so the
 * open dialog shows pending or failed only while the mutation's `variables` are the very object
 * it passed (query-core keeps them by reference). A failure of an add nobody is looking at any
 * more (dialog closed, screen left) is toasted instead.
 *
 * `clear()` goes wherever that dialog or modal closes or stops showing the add.
 *
 * @returns {{
 *   mutation: object, // the screen-wide mutation, for an add no dialog waits for
 *   attempt: object | null, // the variables of the own attempt
 *   start: (variables: object, onSuccess: () => void) => void,
 *   clear: () => void,
 *   isPending: boolean,
 *   isFailed: boolean,
 * }}
 */
export function useAddSessionExerciseAttempt() {
  const [attempt, setAttempt] = useState(null)
  // Mirror of `attempt` for `shouldToastError` and `onSuccess`, which run outside render.
  const attemptRef = useRef(null)
  const mutation = useAddSessionExercise({
    shouldToastError: (_, variables) => variables !== attemptRef.current,
  })

  // Leaving the screen leaves nobody to show the failure inline: it is toasted.
  useEffect(() => () => { attemptRef.current = null }, [])

  const clear = useCallback(() => {
    attemptRef.current = null
    setAttempt(null)
  }, [])

  const start = (variables, onSuccess) => {
    attemptRef.current = variables
    setAttempt(variables)
    mutation.mutate(variables, {
      // A superseded add never closes a newer opening.
      onSuccess: () => { if (variables === attemptRef.current) onSuccess() },
    })
  }

  const isOwn = attempt != null && mutation.variables === attempt
  return {
    mutation,
    attempt,
    start,
    clear,
    isPending: isOwn && mutation.isPending,
    isFailed: isOwn && mutation.isError,
  }
}

/**
 * The session screen's add-exercise flow, the same in both apps: the add modal, the "only today /
 * also in the routine" dialog a routine workout asks before adding, and the add either of them
 * starts (`useAddSessionExerciseAttempt`). The screen only renders it.
 *
 * @returns {{
 *   isModalOpen: boolean,
 *   openModal: () => void,
 *   closeModal: () => void,
 *   submitModal: (data: object) => void, // the add form's payload
 *   backToPicker: () => void, // the modal went back from the config step to the picker
 *   pendingAdd: object | null, // the payload waiting for the dialog's choice; the dialog is open while set
 *   chooseScope: (addToRoutine: boolean) => void,
 *   dismissScope: () => void, // tap outside or Android back on the dialog
 *   attempt: object | null,
 *   isPending: boolean,
 *   isFailed: boolean,
 * }}
 */
export function useAddSessionExerciseFlow() {
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const { mutation, attempt, start, clear, isPending, isFailed } = useAddSessionExerciseAttempt()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingAdd, setPendingAdd] = useState(null)

  const closeModal = () => {
    setIsModalOpen(false)
    clear()
  }

  // A free session has no routine to ask about: the exercise goes to the session only.
  const submitModal = (data) => {
    if (routineDayId == null) {
      start({ ...data, addToRoutine: false }, closeModal)
      return
    }
    setIsModalOpen(false)
    setPendingAdd(data)
  }

  const closeScope = () => {
    setPendingAdd(null)
    clear()
  }

  // The dialog stays open until the add lands, so a slow or failed add shows in it.
  const chooseScope = (addToRoutine) => {
    start({ ...pendingAdd, addToRoutine }, closeScope)
  }

  // Closing before choosing adds to today only. Unlike replace, where closing aborts on purpose:
  // replacing destroys the completed sets, adding destroys nothing, the user already pressed "Add",
  // and the session is the narrow, safe scope. After a choice, closing only walks away: a pending
  // add carries on in the background (a later failure is toasted), a failed one is dropped.
  const dismissScope = () => {
    if (!attempt) mutation.mutate({ ...pendingAdd, addToRoutine: false })
    closeScope()
  }

  return {
    isModalOpen,
    openModal: () => setIsModalOpen(true),
    closeModal,
    submitModal,
    backToPicker: clear,
    pendingAdd,
    chooseScope,
    dismissScope,
    attempt,
    isPending,
    isFailed,
  }
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
