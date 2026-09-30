import { useState, useCallback } from 'react'
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
  setRoutineExerciseSupersetGroup as apiSetRoutineExerciseSupersetGroup,
  addExerciseToDay as apiAddExerciseToDay,
  duplicateRoutineExercise as apiDuplicateRoutineExercise,
  duplicateRoutineDay as apiDuplicateRoutineDay,
  createRoutineDayWithExercises as apiCreateRoutineDayWithExercises,
  moveRoutineExerciseToDay as apiMoveRoutineExerciseToDay,
  duplicateRoutine as apiDuplicateRoutine,
  importRoutine,
} from '../api/routineApi.js'
import { getNotifier } from '../notifications.js'
import { t } from '../i18n/index.js'
import { useUserId } from './useAuth.js'
import { localizeExercisesInList } from '../lib/exerciseUtils.js'
import { getTemplateImportData } from '../lib/routineTemplates.js'
import { applyExerciseOrderToBlocks, placeInSupersetForBlocks } from '../lib/routineDayLayout.js'
import { validateRoutineForm, prepareRoutineData } from '../lib/validation.js'
import {
  buildRoutineDayFromSession,
  getSessionDayNameDefault,
  getDefaultRoutineIdForSession,
  getConvertToRoutineDayState,
  getRoutineDayErrorKey,
  getRoutineDayErrorToken,
  getConvertToRoutineDaySuccessMessage,
  CONVERT_BLOCKED_MESSAGE_KEYS,
  ROUTINE_DAY_ERROR_TOKENS,
} from '../lib/sessionToRoutineDay.js'

export function useRoutines() {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINES],
    queryFn: fetchRoutines
  })
}

export function useRoutine(routineId) {
  const id = String(routineId)
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE, id],
    queryFn: () => fetchRoutine(id),
    enabled: !!routineId
  })
}

export function useRoutineDays(routineId) {
  const id = String(routineId)
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_DAYS, id],
    queryFn: () => fetchRoutineDays(id),
    enabled: !!routineId
  })
}

export function useRoutineDay(dayId) {
  const id = String(dayId)
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_DAY, id],
    queryFn: () => fetchRoutineDay(id),
    enabled: !!dayId
  })
}

export function useRoutineBlocks(dayId) {
  const id = String(dayId)
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, id],
    queryFn: () => fetchRoutineBlocks(id),
    select: localizeExercisesInList,
    enabled: !!dayId
  })
}

/**
 * Obtiene todos los ejercicios de una rutina (de todos los dias)
 * Util para detectar ejercicios duplicados al anadir uno nuevo
 */
export function useRoutineAllExercises(routineId) {
  const id = String(routineId)
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_ALL_EXERCISES, id],
    queryFn: () => fetchRoutineAllExercises(id),
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
    onMutate: async ({ routineId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.ROUTINE] })

      const prevRoutines = queryClient.getQueryData([QUERY_KEYS.ROUTINES])
      const prevRoutine = queryClient.getQueryData([QUERY_KEYS.ROUTINE, routineId])
        ?? queryClient.getQueryData([QUERY_KEYS.ROUTINE, String(routineId)])

      // Optimistic update en la lista
      queryClient.setQueryData([QUERY_KEYS.ROUTINES], old =>
        old?.map(r => r.id === routineId
          ? { ...r, is_favorite: isFavorite }
          : isFavorite ? { ...r, is_favorite: false } : r
        )
      )

      // Optimistic update en el detalle
      queryClient.setQueriesData({ queryKey: [QUERY_KEYS.ROUTINE] }, old =>
        old?.id === routineId ? { ...old, is_favorite: isFavorite } : old
      )

      return { prevRoutines, prevRoutine, routineId }
    },
    onError: (_err, _vars, context) => {
      if (context?.prevRoutines) queryClient.setQueryData([QUERY_KEYS.ROUTINES], context.prevRoutines)
      if (context?.prevRoutine) {
        queryClient.setQueryData([QUERY_KEYS.ROUTINE, context.routineId], context.prevRoutine)
        queryClient.setQueryData([QUERY_KEYS.ROUTINE, String(context.routineId)], context.prevRoutine)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE] })
    },
  })
}

/**
 * Instancia una plantilla en la cuenta del usuario y la fija como favorita (para que aparezca
 * como "entrenamiento de hoy"). Orquestación compartida web+native usada por el onboarding.
 * @returns mutation; `mutateAsync({ template, t })` → rutina creada.
 */
export function useCreateRoutineFromTemplate() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ template, t: translate }) => {
      const routine = await importRoutine(getTemplateImportData(template, translate), userId, { updateExercises: false })
      // Fijar como favorita es best-effort: si `importRoutine` tuvo éxito, la rutina YA existe;
      // no relanzar por un fallo del favorito evita que un reintento cree una rutina duplicada.
      try {
        await apiSetFavoriteRoutine({ routineId: routine.id, isFavorite: true })
      } catch { /* la rutina queda creada aunque no fijada */ }
      return routine
    },
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

export function useDuplicateRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ dayId, newName }) => apiDuplicateRoutineDay({ dayId, newName }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
      getNotifier()?.show(t('routine:day.duplicated'), 'success')
    },
  })
}

// Optimista como `useReorderSessionExercises`: el arrastre suelta la tarjeta donde el dedo la
// deja, así que sin escribir la caché en `onMutate` la lista volvería al orden viejo hasta que
// aterrizase el refetch.
export function useReorderRoutineDays() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ days }) => apiReorderRoutineDays(days),
    onMutate: async ({ routineId, days }) => {
      const queryKey = [QUERY_KEYS.ROUTINE_DAYS, String(routineId)]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      // `sort_order` se renumera 1..n igual que la RPC: de esta caché sale el número con el que
      // se nombra el siguiente día, y dejarla con el orden viejo daría nombres repetidos.
      queryClient.setQueryData(queryKey, days.map((day, index) => ({ ...day, sort_order: index + 1 })))
      return { queryKey, previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous)
      getNotifier()?.show(t('routine:day.reorderFailed'), 'error')
    },
    onSettled: (_data, _err, variables) => {
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

// Optimistic like `useReorderRoutineDays`: the drag drops the row where the finger leaves it, so
// without writing the cache in `onMutate` the list would snap back to the old order until the
// refetch landed. `exercises` is the whole day, warm-up first, as `{ id, supersetGroup? }`:
// membership is applied too, or a row joining a superset would show outside its card until then.
export function useReorderRoutineExercises() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ exercises }) => apiReorderRoutineExercises(exercises),
    onMutate: async ({ dayId, exercises }) => {
      const queryKey = [QUERY_KEYS.ROUTINE_BLOCKS, String(dayId)]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      if (previous) {
        queryClient.setQueryData(queryKey, applyExerciseOrderToBlocks(previous, exercises))
      }
      return { queryKey, previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous)
      getNotifier()?.show(t('routine:exercise.reorderFailed'), 'error')
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

// Non-drag entry point (the action sheet) to join or leave a superset, with the default placement.
// Optimistic with the SAME rule as the API (`placeInSupersetForBlocks`), applied to the day's cache.
export function useSetRoutineExerciseSupersetGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params) => apiSetRoutineExerciseSupersetGroup(params),
    onMutate: async (params) => {
      const queryKey = [QUERY_KEYS.ROUTINE_BLOCKS, String(params.dayId)]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      const items = previous
        ? placeInSupersetForBlocks(previous.flatMap(block => block.routine_exercises || []), { ...params, exerciseId: params.routineExerciseId })
        : null
      if (items) queryClient.setQueryData(queryKey, applyExerciseOrderToBlocks(previous, items))
      return { queryKey, previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous)
      getNotifier()?.show(t('routine:exercise.supersetMoveFailed'), 'error')
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useDuplicateRoutine() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: ({ routineId, newName }) => apiDuplicateRoutine(routineId, userId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      getNotifier()?.show(t('routine:duplicated'), 'success')
    },
    onError: () => {
      getNotifier()?.show(t('routine:duplicateError'), 'error')
    },
  })
}

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

// A new routine changes the list and a new day changes its counts; the detail, its days and its
// exercises are where the user lands next.
export function useCreateRoutineDayWithExercises() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params) => apiCreateRoutineDayWithExercises(params),
    onSuccess: ({ routineId }) => {
      const id = String(routineId)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE, id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_ALL_EXERCISES, id] })
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

/**
 * Form del modal de nombre y descripción de una rutina.
 *
 * Guarda solo al pulsar Guardar: el autoguardado con debounce que había antes perdía la última
 * edición si la pantalla se desmontaba dentro de su ventana, y en un modal con botones explícitos
 * sorprende. `form` se siembra UNA vez al montar; el modal solo monta el form mientras está
 * abierto, así que un refetch de `routine` de fondo no pisa lo que se está escribiendo.
 *
 * @param {object|null} routine - Rutina de la que se siembra el form
 * @param {string|number} routineId
 * @returns {{ form: object, setField: function, error: string|null, submit: function, isSaving: boolean }}
 */
export function useRoutineDetailsForm(routine, routineId) {
  const [form, setForm] = useState(() => ({
    name: routine?.name || '',
    description: routine?.description || '',
  }))
  const [error, setError] = useState(null)
  const updateRoutine = useUpdateRoutine()

  const setField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  // Nunca rechaza: quien llama solo decide si cerrar el modal. Los errores se pintan inline.
  const submit = useCallback(async () => {
    const validation = validateRoutineForm(form)
    if (!validation.valid) {
      setError(validation.error)
      return false
    }
    try {
      await updateRoutine.mutateAsync({
        routineId: parseInt(routineId),
        data: prepareRoutineData(form),
      })
      return true
    } catch {
      setError(t('common:errors.generic'))
      return false
    }
  }, [form, routineId, updateRoutine])

  return { form, setField, error, submit, isSaving: updateRoutine.isPending }
}

/**
 * Dialog of "Convert to routine day" (History), shared by web and native: they only render it.
 *
 * Mount it only while the dialog is open, so every opening starts from the defaults. Until the
 * user picks, the selection is the session's source routine if the list has it: computed on each
 * render, so it also appears when the routines load after the dialog opened.
 *
 * `notice` is what the dialog shows under the inputs: why Confirm is blocked (after pressing it) or
 * why the request failed. Any edit clears it, since it described inputs that changed.
 *
 * @param {object} params
 * @param {object} params.session - History detail of the session (`useSessionDetail`)
 * @param {function} [params.onSuccess] - Called with `{ routineId, dayId }` once the day exists
 */
export function useConvertSessionToRoutineDayForm({ session, onSuccess }) {
  const queryClient = useQueryClient()
  // `isLoadingError`, not `isError`: a failed refetch keeps the cached list, which is still right.
  // Only a first load that failed leaves the list empty for a reason other than "no routines".
  const {
    data: routines,
    isLoading: isLoadingRoutines,
    isLoadingError: isRoutinesError,
    refetch: refetchRoutines,
  } = useRoutines()
  const createDay = useCreateRoutineDayWithExercises()
  // undefined = the user has not picked yet (null is "picked nothing", which cannot happen by hand).
  const [pickedSelection, setPickedSelection] = useState(undefined)
  const [newRoutineName, setNewRoutineNameValue] = useState('')
  const [dayName, setDayNameValue] = useState(() => getSessionDayNameDefault(session, t))
  const [notice, setNotice] = useState(null)

  const defaultRoutineId = getDefaultRoutineIdForSession(session, routines)
  const selection = pickedSelection !== undefined
    ? pickedSelection
    : defaultRoutineId ? { kind: 'existing', routineId: defaultRoutineId } : null
  const isPending = createDay.isPending
  const { blockedReason } = getConvertToRoutineDayState({ selection, newRoutineName, dayName, isPending })

  const selectNewRoutine = () => {
    setPickedSelection({ kind: 'new' })
    setNotice(null)
  }
  const selectRoutine = (routineId) => {
    setPickedSelection({ kind: 'existing', routineId: String(routineId) })
    setNotice(null)
  }
  const setNewRoutineName = (value) => {
    setNewRoutineNameValue(value)
    setNotice(null)
  }
  const setDayName = (value) => {
    setDayNameValue(value)
    setNotice(null)
  }

  const submit = () => {
    if (isPending) return
    if (blockedReason) {
      setNotice({ type: 'info', text: t(CONVERT_BLOCKED_MESSAGE_KEYS[blockedReason]) })
      return
    }
    // Built on press, from the detail as it is now: after `exercise_not_available` the refetched
    // detail marks the exercise deleted, and the next try skips it.
    const { exercises, skipped } = buildRoutineDayFromSession(session?.exercises)
    if (exercises.length === 0) {
      setNotice({ type: 'info', text: t('workout:history.convertToDay.nothingToCopy') })
      return
    }
    setNotice(null)
    const isNewRoutine = selection.kind === 'new'
    createDay.mutate(
      {
        routineId: isNewRoutine ? null : Number(selection.routineId),
        newRoutineName: isNewRoutine ? newRoutineName.trim() : null,
        dayName: dayName.trim(),
        exercises,
      },
      {
        onSuccess: (result) => {
          getNotifier()?.show(getConvertToRoutineDaySuccessMessage(skipped, t), 'success')
          onSuccess?.(result)
        },
        onError: (error) => {
          setNotice({ type: 'error', text: t(getRoutineDayErrorKey(error)) })
          // The error proves a cached query stale: refetch it so the next try works.
          const token = getRoutineDayErrorToken(error)
          // The detail can be minutes old after an exercise is deleted from the catalogue.
          if (token === ROUTINE_DAY_ERROR_TOKENS.EXERCISE_NOT_AVAILABLE) {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, session.id] })
          }
          // The routine was deleted elsewhere: drop it from the list and from the selection.
          if (token === ROUTINE_DAY_ERROR_TOKENS.ROUTINE_NOT_FOUND) {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
            setPickedSelection(undefined)
          }
        },
      }
    )
  }

  return {
    routines: routines ?? [],
    isLoadingRoutines,
    isRoutinesError,
    // Wrapped: a press handler would pass its event as `refetch`'s options.
    retryRoutines: () => { refetchRoutines() },
    isNewRoutine: selection?.kind === 'new',
    selectedRoutineId: selection?.kind === 'existing' ? selection.routineId : null,
    selectNewRoutine,
    selectRoutine,
    newRoutineName,
    setNewRoutineName,
    dayName,
    setDayName,
    isBlocked: blockedReason != null,
    notice,
    submit,
    isPending,
  }
}
