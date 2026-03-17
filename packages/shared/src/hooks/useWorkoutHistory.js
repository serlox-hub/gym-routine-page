import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  fetchWorkoutHistory,
  fetchSessionDetail,
  fetchExerciseHistorySummary,
  fetchExerciseHistory,
  fetchPreviousWorkout,
  deleteWorkoutSession,
} from '../api/workoutApi.js'
import {
  fetchExerciseChartData,
  fetchExerciseAllTimeStats,
  fetchSessionPRs,
  recalculateExercisePRs,
} from '../api/exerciseStatsApi.js'

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
      return data.map(session => {
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

export function useSessionDetail(sessionId) {
  return useQuery({
    queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId],
    queryFn: async () => {
      const session = await fetchSessionDetail(sessionId)

      // Transformar a formato esperado por los componentes
      const exercises = (session.session_exercises || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(se => ({
          sessionExerciseId: se.id,
          exercise: se.exercise,
          series: se.series,
          reps: se.reps,
          is_extra: se.is_extra,
          block_name: se.block_name,
          sets: (se.completed_sets || []).sort((a, b) => a.set_number - b.set_number)
        }))

      return {
        ...session,
        exercises,
        session_exercises: undefined // Limpiar campo intermedio
      }
    },
    enabled: !!sessionId,
  })
}

// ============================================
// EXERCISE HISTORY QUERIES
// ============================================

export function useExerciseHistorySummary(exerciseId, routineDayId = null) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, 'summary', exerciseId, routineDayId],
    queryFn: async () => {
      const data = await fetchExerciseHistorySummary({ exerciseId, routineDayId })

      return data.map(se => ({
        sessionId: se.session.id,
        date: se.session.started_at,
        sets: se.completed_sets.sort((a, b) => a.set_number - b.set_number)
      }))
    },
    enabled: !!exerciseId,
  })
}

const EXERCISE_HISTORY_PAGE_SIZE = 30

export function useExerciseHistory(exerciseId, routineDayId = null) {
  return useInfiniteQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, exerciseId, routineDayId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * EXERCISE_HISTORY_PAGE_SIZE
      const to = from + EXERCISE_HISTORY_PAGE_SIZE - 1

      const data = await fetchExerciseHistory({ exerciseId, routineDayId, from, to })

      return data.map(se => ({
        sessionId: se.session.id,
        date: se.session.started_at,
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

export function usePreviousWorkout(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.PREVIOUS_WORKOUT, exerciseId],
    queryFn: async () => {
      const data = await fetchPreviousWorkout(exerciseId)
      if (!data || data.length === 0) return null

      const lastSession = data[0]

      return {
        date: lastSession.session.started_at,
        sets: lastSession.completed_sets
          .map(set => ({
            setNumber: set.set_number,
            weight: set.weight,
            weightUnit: set.weight_unit,
            reps: set.reps_completed,
            timeSeconds: set.time_seconds,
            distanceMeters: set.distance_meters,
            paceSeconds: set.pace_seconds,
            rir: set.rir_actual,
            notes: set.notes
          }))
          .sort((a, b) => a.setNumber - b.setNumber)
      }
    },
    enabled: !!exerciseId,
    staleTime: 1000 * 60 * 10
  })
}

// ============================================
// EXERCISE STATS QUERIES (from exercise_session_stats)
// ============================================

export function useExerciseChartData(exerciseId, routineDayId = null) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, 'chart', exerciseId, routineDayId],
    queryFn: () => fetchExerciseChartData({ exerciseId, routineDayId }),
    enabled: !!exerciseId,
  })
}

export function useExerciseAllTimeStats(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, 'alltime', exerciseId],
    queryFn: () => fetchExerciseAllTimeStats(exerciseId),
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

export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sessionId, exerciseIds, sessionDate }) => {
      await deleteWorkoutSession(sessionId)
      return { sessionId, exerciseIds, sessionDate }
    },
    onSuccess: async ({ sessionId, exerciseIds, sessionDate }) => {
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISE_HISTORY] })

      // Recalcular PRs de los ejercicios afectados
      if (exerciseIds?.length > 0 && sessionDate) {
        try {
          await Promise.all(
            exerciseIds.map(eid => recalculateExercisePRs(eid, sessionDate))
          )
        } catch {
          // No bloquear si falla la recalculación
        }
      }
    },
  })
}
