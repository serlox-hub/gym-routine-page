import { useRef, useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { evaluateSetForPR } from '../lib/sessionStatsCalculation.js'
import { fetchExerciseBests } from '../api/exerciseStatsApi.js'
import { useWorkoutStore } from './_stores.js'
import { getHaptics } from '../haptics.js'

// ============================================
// REAL-TIME PR DETECTION DURING SESSION
// ============================================

export function useSessionPRDetection() {
  const sessionId = useWorkoutStore(state => state.sessionId)
  const queryClient = useQueryClient()

  // Pre-session bests cache: { [exerciseId]: { bestWeight, ... } | 'loading' | 'none' }
  const preSessionBestsRef = useRef({})
  // Running bests during session: { [exerciseId]: { bestWeight, ... } }
  const runningBestsRef = useRef({})

  // Sets que fueron PR en esta sesión: Set de keys "sessionExerciseId-setNumber"
  const [prSets, setPRSets] = useState(new Set())

  // Latest PR notification (auto-clears)
  const [prNotification, setPRNotification] = useState(null)
  const timerRef = useRef(null)

  const resetPRState = useCallback(() => {
    preSessionBestsRef.current = {}
    runningBestsRef.current = {}
    setPRSets(new Set())
    setPRNotification(null)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const checkSetForPR = useCallback(async (setData) => {
    if (!sessionId) return

    // Buscar el ejercicio en el cache de session exercises
    const sessionExercises = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId])
    if (!sessionExercises) return

    const sessionExercise = sessionExercises.find(se => se.id === setData.sessionExerciseId)
    if (!sessionExercise) return

    const exerciseId = sessionExercise.exercise_id
    const measurementType = sessionExercise.exercise?.measurement_type || 'weight_reps'

    // Lazy-fetch pre-session bests
    let preBests = preSessionBestsRef.current[exerciseId]
    if (!preBests) {
      preSessionBestsRef.current[exerciseId] = 'loading'
      try {
        const allBests = await fetchExerciseBests([exerciseId])
        preBests = allBests[exerciseId] || null
        preSessionBestsRef.current[exerciseId] = preBests || 'none'
      } catch {
        preSessionBestsRef.current[exerciseId] = 'none'
        return
      }
    }

    if (preBests === 'loading') return
    if (preBests === 'none') return // Primera vez del ejercicio, no detectar PR

    const dbFormatSet = {
      weight: setData.weight ?? null,
      reps_completed: setData.repsCompleted ?? null,
      time_seconds: setData.timeSeconds ?? null,
      distance_meters: setData.distanceMeters ?? null,
      pace_seconds: setData.paceSeconds ?? null,
    }

    const runningBests = runningBestsRef.current[exerciseId] || {}

    const { newRecords, updatedRunningBests } = evaluateSetForPR(
      dbFormatSet,
      runningBests,
      preBests,
      measurementType,
    )

    runningBestsRef.current[exerciseId] = updatedRunningBests

    if (newRecords.length > 0) {
      getHaptics()?.onPRDetected?.()

      const setKey = `${setData.sessionExerciseId}-${setData.setNumber}`
      setPRSets(prev => new Set(prev).add(setKey))

      const notification = {
        exerciseName: sessionExercise.exercise?.name || 'Ejercicio',
        records: newRecords,
        timestamp: Date.now(),
      }
      setPRNotification(notification)

      // Auto-dismiss después de 4 segundos
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setPRNotification(null), 4000)
    }
  }, [sessionId, queryClient])

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const clearSetPR = useCallback((sessionExerciseId, setNumber) => {
    const key = `${sessionExerciseId}-${setNumber}`
    setPRSets(prev => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  return { checkSetForPR, clearSetPR, prSets, prNotification, dismissPR: () => setPRNotification(null), resetPRState }
}
