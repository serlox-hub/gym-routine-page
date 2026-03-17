import { useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  buildSessionExercisesCache,
  buildSessionExercisesFromBlocks,
} from '../lib/workoutTransforms.js'
import {
  calculateSessionExerciseStats,
  detectNewPersonalRecords,
} from '../lib/sessionStatsCalculation.js'
import {
  fetchActiveSession,
  fetchCompletedSetsForSession,
  startWorkoutSession,
  fetchExerciseIdsWithSets,
  deleteSessionExercisesWithoutSets,
  completeWorkoutSession,
  deleteWorkoutSession,
} from '../api/workoutApi.js'
import {
  fetchExerciseBests,
  upsertExerciseSessionStats,
} from '../api/exerciseStatsApi.js'
import { fetchSessionExercises } from '../api/sessionExercisesApi.js'
import { useWorkoutStore, getWorkoutStore } from './_stores.js'
import { useUserId } from './useAuth.js'

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
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ overallFeeling, notes }) => {
      // Capturar sets del store antes de que se limpie
      const completedSets = getWorkoutStore().getState().completedSets

      // Eliminar session_exercises sin series completadas
      const exerciseIdsWithSets = await fetchExerciseIdsWithSets(sessionId)

      if (exerciseIdsWithSets.length > 0) {
        await deleteSessionExercisesWithoutSets(sessionId, exerciseIdsWithSets)
      }

      const completedAt = new Date()
      const startedAtDate = new Date(startedAt)
      const durationMinutes = Math.round((completedAt - startedAtDate) / 60000)

      const sessionData = await completeWorkoutSession({
        sessionId,
        completedAt: completedAt.toISOString(),
        durationMinutes,
        overallFeeling,
        notes,
      })

      // Computar exercise_session_stats + detectar PRs
      const detectedPRs = await computeSessionStats({
        sessionId,
        sessionDate: startedAt,
        userId,
        completedSets,
        queryClient,
      })

      return { session: sessionData, detectedPRs }
    },
    onSuccess: () => {
      endSession()
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
    },
  })
}

// ============================================
// SESSION STATS COMPUTATION (internal)
// ============================================

function storeSetToDbFormat(storeSet) {
  return {
    weight: storeSet.weight ?? null,
    reps_completed: storeSet.repsCompleted ?? null,
    time_seconds: storeSet.timeSeconds ?? null,
    distance_meters: storeSet.distanceMeters ?? null,
    pace_seconds: storeSet.paceSeconds ?? null,
  }
}

async function computeSessionStats({ sessionId, sessionDate, userId, completedSets, queryClient }) {
  try {
    // Obtener session_exercises (del cache o fetch)
    let sessionExercises = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId])
    if (!sessionExercises) {
      sessionExercises = await fetchSessionExercises(sessionId)
    }
    if (!sessionExercises || sessionExercises.length === 0) return []

    // Agrupar completed sets por sessionExerciseId
    const setsByExercise = {}
    for (const storeSet of Object.values(completedSets)) {
      const seId = storeSet.sessionExerciseId
      if (!setsByExercise[seId]) setsByExercise[seId] = []
      setsByExercise[seId].push(storeSetToDbFormat(storeSet))
    }

    // Mapear sessionExerciseId → exerciseId + measurementType
    const exerciseMap = {}
    const exerciseIds = []
    const measurementTypes = {}
    for (const se of sessionExercises) {
      if (!setsByExercise[se.id]) continue
      const mt = se.exercise?.measurement_type || 'weight_reps'
      exerciseMap[se.id] = {
        exerciseId: se.exercise_id,
        measurementType: mt,
      }
      if (!exerciseIds.includes(se.exercise_id)) {
        exerciseIds.push(se.exercise_id)
        measurementTypes[se.exercise_id] = mt
      }
    }

    if (exerciseIds.length === 0) return []

    // Calcular stats y obtener bests previos en paralelo
    const statsPerExercise = {}
    for (const [seId, sets] of Object.entries(setsByExercise)) {
      const info = exerciseMap[seId]
      if (!info) continue
      const stats = calculateSessionExerciseStats(sets, info.measurementType)
      if (!stats) continue

      // Agregar stats por exerciseId (puede haber múltiples sessionExerciseId para el mismo exerciseId)
      if (!statsPerExercise[info.exerciseId]) {
        statsPerExercise[info.exerciseId] = stats
      } else {
        mergeExerciseStats(statsPerExercise[info.exerciseId], stats)
      }
    }

    const previousBests = await fetchExerciseBests(exerciseIds)

    // Detectar PRs y preparar filas para upsert
    const statsRows = []
    const allDetectedPRs = []

    for (const exerciseId of exerciseIds) {
      const stats = statsPerExercise[exerciseId]
      if (!stats) continue

      const bests = previousBests[exerciseId] || null
      const { flags, details } = detectNewPersonalRecords(stats, bests, measurementTypes[exerciseId])

      statsRows.push({
        userId,
        exerciseId,
        sessionId,
        sessionDate,
        ...stats,
        ...flags,
      })

      if (details.length > 0) {
        const exerciseInfo = sessionExercises.find(se => se.exercise_id === exerciseId)
        allDetectedPRs.push({
          exerciseId,
          exerciseName: exerciseInfo?.exercise?.name || 'Ejercicio',
          details,
        })
      }
    }

    if (statsRows.length > 0) {
      await upsertExerciseSessionStats(statsRows)
    }

    return allDetectedPRs
  } catch {
    // No bloquear el fin de sesión si falla el cálculo de stats
    return []
  }
}

function mergeExerciseStats(target, source) {
  if (source.bestWeight && (!target.bestWeight || source.bestWeight > target.bestWeight)) {
    target.bestWeight = source.bestWeight
  }
  if (source.bestReps && (!target.bestReps || source.bestReps > target.bestReps)) {
    target.bestReps = source.bestReps
  }
  if (source.best1rm && (!target.best1rm || source.best1rm > target.best1rm)) {
    target.best1rm = source.best1rm
  }
  if (source.totalVolume) {
    target.totalVolume = (target.totalVolume || 0) + source.totalVolume
  }
  target.totalSets = (target.totalSets || 0) + (source.totalSets || 0)
  if (source.bestTimeSeconds && (!target.bestTimeSeconds || source.bestTimeSeconds > target.bestTimeSeconds)) {
    target.bestTimeSeconds = source.bestTimeSeconds
  }
  if (source.bestDistanceMeters && (!target.bestDistanceMeters || source.bestDistanceMeters > target.bestDistanceMeters)) {
    target.bestDistanceMeters = source.bestDistanceMeters
  }
  if (source.bestPaceSeconds && (!target.bestPaceSeconds || source.bestPaceSeconds < target.bestPaceSeconds)) {
    target.bestPaceSeconds = source.bestPaceSeconds
  }
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
