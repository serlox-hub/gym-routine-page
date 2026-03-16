import { useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  buildSessionExercisesCache,
  buildSessionExercisesFromBlocks,
} from '../lib/workoutTransforms.js'
import {
  fetchActiveSession,
  fetchCompletedSetsForSession,
  startWorkoutSession,
  fetchExerciseIdsWithSets,
  deleteSessionExercisesWithoutSets,
  completeWorkoutSession,
  deleteWorkoutSession,
} from '../api/workoutApi.js'
import { useWorkoutStore, getWorkoutStore } from './_stores.js'

// ============================================
// SESSION RESTORATION
// ============================================

function buildCompletedSetsMap(rawSets) {
  const setsMap = {}
  for (const set of rawSets) {
    const key = `${set.session_exercise_id}-${set.set_number}`
    setsMap[key] = {
      sessionExerciseId: set.session_exercise_id,
      setNumber: set.set_number,
      weight: set.weight,
      weightUnit: set.weight_unit,
      repsCompleted: set.reps_completed,
      timeSeconds: set.time_seconds,
      distanceMeters: set.distance_meters,
      paceSeconds: set.pace_seconds,
      rirActual: set.rir_actual,
      notes: set.notes,
      videoUrl: set.video_url,
    }
  }
  return setsMap
}

export function useRestoreActiveSession({ onVisibilityChange } = {}) {
  const restoreSession = useWorkoutStore(state => state.restoreSession)
  const endSession = useWorkoutStore(state => state.endSession)

  const syncRef = useRef()
  syncRef.current = async () => {
    try {
      const activeSession = await fetchActiveSession()
      const localSessionId = getWorkoutStore().getState().sessionId

      if (!localSessionId) {
        if (!activeSession) return
        const rawSets = await fetchCompletedSetsForSession(activeSession.id)
        const completedSets = buildCompletedSetsMap(rawSets)
        restoreSession({
          sessionId: activeSession.id,
          routineDayId: activeSession.routine_day_id,
          routineId: activeSession.routine_days?.routine_id || null,
          startedAt: activeSession.started_at,
          completedSets,
          cachedSetData: completedSets,
        })
      } else if (!activeSession || activeSession.id !== localSessionId) {
        endSession()
      }
    } catch {
      // Error de red — no tocar el estado local para no perder datos
    }
  }

  useEffect(() => {
    syncRef.current()

    if (!onVisibilityChange) return
    const cleanup = onVisibilityChange(() => syncRef.current())
    return cleanup
  }, [onVisibilityChange])
}

// ============================================
// SESSION MUTATIONS
// ============================================

export function useStartSession({ onStartError } = {}) {
  const queryClient = useQueryClient()
  const startSession = useWorkoutStore(state => state.startSession)

  return useMutation({
    mutationFn: async ({ routineDayId = null, routineName = null, dayName = null, blocks = [] } = {}) => {
      const exercises = buildSessionExercisesFromBlocks(blocks)
      return startWorkoutSession({ routineDayId, routineName, dayName, exercises })
    },
    onSuccess: (data, { routineDayId = null, routineId = null, blocks = [] } = {}) => {
      startSession(data.id, routineDayId, routineId)

      if (data.session_exercises?.length > 0) {
        const cacheData = buildSessionExercisesCache(data.session_exercises, blocks)
        queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, data.id], cacheData)
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
    },
    onError: () => {
      onStartError?.()
    },
  })
}

export function useEndSession() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const startedAt = useWorkoutStore(state => state.startedAt)
  const endSession = useWorkoutStore(state => state.endSession)

  return useMutation({
    mutationFn: async ({ overallFeeling, notes }) => {
      // Eliminar session_exercises sin series completadas
      const exerciseIdsWithSets = await fetchExerciseIdsWithSets(sessionId)

      if (exerciseIdsWithSets.length > 0) {
        await deleteSessionExercisesWithoutSets(sessionId, exerciseIdsWithSets)
      }

      const completedAt = new Date()
      const startedAtDate = new Date(startedAt)
      const durationMinutes = Math.round((completedAt - startedAtDate) / 60000)

      return completeWorkoutSession({
        sessionId,
        completedAt: completedAt.toISOString(),
        durationMinutes,
        overallFeeling,
        notes,
      })
    },
    onSuccess: () => {
      endSession()
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
    },
  })
}

export function useAbandonSession() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const endSession = useWorkoutStore(state => state.endSession)

  return useMutation({
    mutationFn: async () => {
      await deleteWorkoutSession(sessionId)
    },
    onSuccess: () => {
      endSession()
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES] })
    },
  })
}
