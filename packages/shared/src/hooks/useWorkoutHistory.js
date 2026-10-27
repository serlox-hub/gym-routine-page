import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  fetchWorkoutHistory,
  fetchSessionDetail,
  fetchExerciseHistorySummary,
  fetchPreviousWorkout,
  updateSessionMetadata,
  rescheduleSession,
  deleteWorkoutSession,
  fetchCompletedSessionCount,
  upsertCompletedSet,
  deleteCompletedSet,
  correctSessionExercise,
} from '../api/workoutApi.js'
import { fetchUserExerciseGymUnit } from '../api/exerciseApi.js'
import { fetchPreferences } from '../api/preferencesApi.js'
import { getConversionFactor } from '../api/weightConversionApi.js'
import {
  fetchExerciseChartData,
  fetchExerciseAllTimeStats,
  fetchSessionPRs,
  recalculateExercisePRs,
  recalculateSessionStats,
} from '../api/exerciseStatsApi.js'
import { transformSessionDetailData, buildPreviousWorkoutRef } from '../lib/workoutTransforms.js'
import {
  HISTORY_FILTER,
  classifyRoutineMembership,
  filterByRoutineMembership,
  getHistoryFilterOptions,
  resolveHistoryFilter,
} from '../lib/routineMembership.js'
import { localizeExercisesInList, localizeExercise, resolveWeightUnit } from '../lib/exerciseUtils.js'
import { getNotifier } from '../notifications.js'
import { t } from '../i18n/index.js'
import { useUserId } from './useAuth.js'
import { useRoutineDays } from './useRoutines.js'

// ============================================
// HISTORY QUERIES
// ============================================

export function useWorkoutHistory(currentDate) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const from = new Date(year, month, 1).toISOString()
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  return useQuery({
    queryKey: [QUERY_KEYS.WORKOUT_HISTORY, year, month],
    queryFn: async () => {
      const data = await fetchWorkoutHistory({ from, to })

      // Extraer grupos musculares únicos de cada sesión
      return localizeExercisesInList(data).map(session => {
        const muscleGroupsSet = new Set()
        session.session_exercises?.forEach(se => {
          if (se.exercise?.muscle_group?.name) {
            muscleGroupsSet.add(se.exercise.muscle_group.name)
          }
        })
        return {
          ...session,
          muscleGroups: Array.from(muscleGroupsSet),
        }
      })
    },
  })
}

export function useCompletedSessionCount() {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKOUT_HISTORY, 'count'],
    queryFn: fetchCompletedSessionCount,
    staleTime: 60_000,
  })
}

export function useSessionDetail(sessionId) {
  return useQuery({
    queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId],
    queryFn: async () => {
      const session = await fetchSessionDetail(sessionId)
      const transformed = transformSessionDetailData(session)
      if (transformed?.exercises) {
        transformed.exercises = localizeExercisesInList(transformed.exercises)
      }
      return transformed
    },
    enabled: !!sessionId,
  })
}

// ============================================
// EXERCISE HISTORY QUERIES
// ============================================

export function useExerciseHistorySummary(exerciseId, routineDayId = null, gymId = null) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, 'summary', exerciseId, routineDayId, gymId],
    queryFn: async () => {
      const data = await fetchExerciseHistorySummary({ exerciseId, routineDayId, gymId })

      return data.map(se => ({
        sessionId: se.session.id,
        date: se.session.started_at,
        gymId: se.session.gym_id ?? null,
        routineDayId: se.session.routine_day_id ?? null,
        sets: se.completed_sets.sort((a, b) => a.set_number - b.set_number)
      }))
    },
    enabled: !!exerciseId,
  })
}

// ============================================
// EXERCISE HISTORY FILTER
// ============================================

const getSessionRoutineDayId = (session) => session.routineDayId
const getChartRowRoutineDayId = (row) => row.session?.routine_day_id

/**
 * The history modal's routine filter: the selector's segments, the one in effect, each session's
 * mark, and the summary sessions and chart rows it keeps. It filters on the client, so switching
 * segments sends no request. Starts on ALL on every mount (the modal mounts on open).
 * @param {{ routineDayId: number|string|null, routineId: number|string|null, sessions?: Array, chartRows?: Array }} params
 *   `sessions` from `useExerciseHistorySummary`, `chartRows` from `useExerciseChartData`.
 * @returns {{ options: Array<{ value: string, labelKey: string }>, filter: string, setFilter: Function,
 *   membershipOf: (session: object) => string|null, sessions: Array|undefined, chartRows: Array|undefined,
 *   isLoading: boolean }} `membershipOf` gives null when there is no current day (no mark at all).
 */
export function useExerciseHistoryFilter({ routineDayId, routineId, sessions, chartRows }) {
  const hasRoutineDay = routineDayId != null
  // Without a current day nothing is compared against the routine: it is not even asked for.
  // `isLoading`, not `isPending`: a disabled query stays pending forever.
  const { data: routineDays, isLoading } = useRoutineDays(hasRoutineDay ? routineId : null)
  // Unknown (no routine id, or the query failed before any data) is NOT "no days": the selector
  // drops "this routine" and no session is marked "other day" rather than guess.
  const routineDayIds = useMemo(() => (Array.isArray(routineDays) ? routineDays.map(day => day.id) : null), [routineDays])

  // No selector until the days arrive, rather than two segments that turn into three.
  const options = useMemo(
    () => (isLoading ? [] : getHistoryFilterOptions({ hasRoutineDay, routineDaysKnown: routineDayIds != null })),
    [isLoading, hasRoutineDay, routineDayIds]
  )
  const [selected, setFilter] = useState(HISTORY_FILTER.ALL)
  const filter = resolveHistoryFilter(selected, options)

  const membershipOf = useCallback(
    (session) => (hasRoutineDay ? classifyRoutineMembership(session.routineDayId, routineDayId, routineDayIds) : null),
    [hasRoutineDay, routineDayId, routineDayIds]
  )
  const filteredSessions = useMemo(
    () => filterByRoutineMembership(sessions, filter, getSessionRoutineDayId, routineDayId, routineDayIds),
    [sessions, filter, routineDayId, routineDayIds]
  )
  const filteredChartRows = useMemo(
    () => filterByRoutineMembership(chartRows, filter, getChartRowRoutineDayId, routineDayId, routineDayIds),
    [chartRows, filter, routineDayId, routineDayIds]
  )

  return { options, filter, setFilter, membershipOf, sessions: filteredSessions, chartRows: filteredChartRows, isLoading }
}

// La referencia "Anterior" se segrega por gym (unidades/máquina) y prioriza el mismo día de rutina
// (mismo slot); si no hay registro en ese slot, cae a la última vez del ejercicio en ese gym.
export function usePreviousWorkout(exerciseId, { gymId = null, routineDayId = null, sessionId = null } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.PREVIOUS_WORKOUT, exerciseId, gymId, routineDayId],
    queryFn: async () => {
      const { sameSlot, fallback } = await fetchPreviousWorkout({ exerciseId, gymId, routineDayId })
      return buildPreviousWorkoutRef({ sameSlot, fallback, currentRoutineDayId: routineDayId })
    },
    // Gateamos por sessionId (sesión cargada en el store), NO por gymId. Motivo: sin gymId,
    // fetchPreviousWorkout omite el filtro y devuelve la última sesión de CUALQUIER gym (fuga
    // cross-gym). Pero `gymId==null` es ambiguo: (a) sesión aún no cargada (rehidratación async
    // del store en native) → null ESPURIO, hay que esperar; (b) sesión sin gym (libre sin gym
    // seleccionado, o legacy previa a la feature) → null LEGÍTIMO, mostramos "Anterior" con lo que
    // haya (best-effort: para un usuario que entrena siempre sin gym es su único bucket). El store
    // fija sessionId y gymId atómicamente (startSession/restoreSession), así que sessionId presente
    // ⇒ gymId es el valor REAL de la sesión (número, o null legítimo). Gatear por gymId ocultaría
    // "Anterior" en las sesiones sin gym; gatear por sessionId cubre ambos casos.
    enabled: !!exerciseId && sessionId != null,
    staleTime: 1000 * 60 * 10
  })
}

// ============================================
// EXERCISE STATS QUERIES (from exercise_session_stats)
// ============================================

export function useExerciseChartData(exerciseId, routineDayId = null, gymId = null) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, 'chart', exerciseId, routineDayId, gymId ?? 'all'],
    queryFn: () => fetchExerciseChartData({ exerciseId, routineDayId, gymId }),
    enabled: !!exerciseId,
  })
}

export function useExerciseAllTimeStats(exerciseId, gymId = null) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, 'alltime', exerciseId, gymId ?? 'all'],
    queryFn: () => fetchExerciseAllTimeStats({ exerciseId, gymId }),
    enabled: !!exerciseId,
  })
}

export function useSessionPRs(sessionId) {
  return useQuery({
    queryKey: [QUERY_KEYS.SESSION_DETAIL, 'prs', sessionId],
    queryFn: () => fetchSessionPRs(sessionId),
    enabled: !!sessionId,
  })
}

// ============================================
// HISTORY MUTATIONS
// ============================================

// A past session saves on blur or tap with no "saving" state, so a failed save has to say so or
// the user takes the change as kept. Offline, the default `networkMode: 'online'` pauses the
// mutation instead of failing it: onError never runs, and the change is lost when the page closes.
// `shouldToastError` returning false skips the toast, for a failure the screen already shows inline.
function notifyOnFailure(messageKey, shouldToastError) {
  return {
    networkMode: 'always',
    onError: (error, variables) => {
      if (shouldToastError && !shouldToastError(error, variables)) return
      getNotifier()?.show(t(messageKey), 'error')
    },
  }
}

export function useUpdateSessionMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    ...notifyOnFailure('workout:history.saveFailed'),
    mutationFn: ({ sessionId, completedAt, durationMinutes, overallFeeling, notes }) => {
      return updateSessionMetadata({ sessionId, completedAt, durationMinutes, overallFeeling, notes })
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
      // Mover el fin puede cruzar de semana: lo que se agrega por `completed_at` también queda stale.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEEKLY_PRS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LAST_SESSION_FOR_ROUTINE] })
    },
  })
}

/**
 * Mueve una sesión terminada a otro inicio. Invalida todo lo que se ordena, agrupa o
 * cuenta por `started_at` o por `duration_minutes`.
 */
export function useRescheduleSession() {
  const queryClient = useQueryClient()

  return useMutation({
    ...notifyOnFailure('workout:history.saveFailed'),
    mutationFn: ({ sessionId, startedAt, durationMinutes }) => {
      return rescheduleSession({ sessionId, startedAt, durationMinutes })
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, 'prs', sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISE_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PREVIOUS_WORKOUT] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEEKLY_PRS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LAST_SESSION_FOR_ROUTINE] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS] })
    },
  })
}

/** @param {{ shouldToastError?: (error: Error, variables: object) => boolean }} [options] */
export function useUpsertCompletedSet({ shouldToastError } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    ...notifyOnFailure('workout:history.saveFailed', shouldToastError),
    mutationFn: async (setData) => {
      const result = await upsertCompletedSet(setData)
      // Recalcular stats y PRs para que ediciones post-sesión no dejen exercise_session_stats desincronizado
      try { await recalculateSessionStats(setData.sessionId) } catch { /* no bloquear UI */ }
      return result
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, 'prs', sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PREVIOUS_WORKOUT] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISE_HISTORY] })
    },
  })
}

export function useDeleteCompletedSet() {
  const queryClient = useQueryClient()

  return useMutation({
    ...notifyOnFailure('workout:history.deleteSetFailed'),
    mutationFn: async ({ sessionId, sessionExerciseId, setNumber }) => {
      const result = await deleteCompletedSet({ sessionId, sessionExerciseId, setNumber })
      try { await recalculateSessionStats(sessionId) } catch { /* no bloquear UI */ }
      return result
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, 'prs', sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PREVIOUS_WORKOUT] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISE_HISTORY] })
    },
  })
}

// Corrects the exercise of a past session row, keeping its sets. Weights are stored raw in the unit
// of (exercise, gym), so both units are resolved for the SESSION's gym and the RPC converts. Every
// read is fresh and any failure aborts before writing: a wrong factor would change the numbers'
// meaning silently. The recalculation is NOT best effort, unlike a set edit: if it fails the new
// exercise has no stats row for the session, so the error reaches the modal and a retry (a no-op in
// the RPC, then the recalculation again) completes it.
export function useCorrectSessionExercise() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ sessionId, sessionExerciseId, oldExerciseId, newExerciseId, gymId }) => {
      const [oldGymUnit, newGymUnit, preferenceRows] = await Promise.all([
        fetchUserExerciseGymUnit(oldExerciseId, gymId),
        fetchUserExerciseGymUnit(newExerciseId, gymId),
        fetchPreferences(userId),
      ])
      const globalUnit = preferenceRows?.find(row => row.key === 'weight_unit')?.value
      const weightFactor = getConversionFactor(
        resolveWeightUnit(oldGymUnit, { weight_unit: globalUnit }),
        resolveWeightUnit(newGymUnit, { weight_unit: globalUnit }),
      )
      await correctSessionExercise({ sessionExerciseId, newExerciseId, weightFactor })
      await recalculateSessionStats(sessionId)
    },
    onSettled: (_, __, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, 'prs', sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISE_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PREVIOUS_WORKOUT] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WEEKLY_PRS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECENT_EXERCISES] })
    },
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sessionId, exerciseIds, sessionDate, gymId = null }) => {
      await deleteWorkoutSession(sessionId)
      return { sessionId, exerciseIds, sessionDate, gymId }
    },
    onSuccess: async ({ sessionId, exerciseIds, sessionDate, gymId }) => {
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISE_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS] })

      // Recalcular PRs de los ejercicios afectados (dentro del gym de la sesión)
      if (exerciseIds?.length > 0 && sessionDate) {
        try {
          await Promise.all(
            exerciseIds.map(eid => recalculateExercisePRs(eid, sessionDate, gymId))
          )
        } catch {
          // No bloquear si falla la recalculación
        }
      }
    },
  })
}
