import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  fetchWorkoutHistory,
  fetchSessionDetail,
  fetchExerciseHistorySummary,
  fetchExerciseHistory,
  fetchPreviousWorkout,
  updateSessionMetadata,
  deleteWorkoutSession,
  fetchCompletedSessionCount,
  upsertCompletedSet,
  deleteCompletedSet,
} from '../api/workoutApi.js'
import {
  fetchExerciseChartData,
  fetchExerciseAllTimeStats,
  fetchSessionPRs,
  recalculateExercisePRs,
  recalculateSessionStats,
} from '../api/exerciseStatsApi.js'
import { transformSessionDetailData, buildPreviousWorkoutRef } from '../lib/workoutTransforms.js'
import { localizeExercisesInList, localizeExercise } from '../lib/exerciseUtils.js'

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
        sets: se.completed_sets.sort((a, b) => a.set_number - b.set_number)
      }))
    },
    enabled: !!exerciseId,
  })
}

const EXERCISE_HISTORY_PAGE_SIZE = 30

export function useExerciseHistory(exerciseId, routineDayId = null, gymId = null) {
  return useInfiniteQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, exerciseId, routineDayId, gymId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * EXERCISE_HISTORY_PAGE_SIZE
      const to = from + EXERCISE_HISTORY_PAGE_SIZE - 1

      const data = await fetchExerciseHistory({ exerciseId, routineDayId, from, to, gymId })

      return data.map(se => ({
        sessionId: se.session.id,
        date: se.session.started_at,
        gymId: se.session.gym_id ?? null,
        sets: se.completed_sets.sort((a, b) => a.set_number - b.set_number)
      }))
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < EXERCISE_HISTORY_PAGE_SIZE) return undefined
      return allPages.length
    },
    enabled: !!exerciseId,
  })
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

export function useUpdateSessionMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, completedAt, durationMinutes, overallFeeling, notes }) => {
      return updateSessionMetadata({ sessionId, completedAt, durationMinutes, overallFeeling, notes })
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS] })
    },
  })
}

export function useUpsertCompletedSet() {
  const queryClient = useQueryClient()

  return useMutation({
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
