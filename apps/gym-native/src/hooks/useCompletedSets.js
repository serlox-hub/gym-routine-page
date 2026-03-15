import { useRef, useCallback, useEffect } from 'react'
import { AppState } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  QUERY_KEYS,
  upsertCompletedSet,
  updateSetVideo as updateSetVideoApi,
  updateSetDetails as updateSetDetailsApi,
  deleteCompletedSet,
} from '@gym/shared'
import useWorkoutStore from '../stores/workoutStore.js'

// ============================================
// SET MUTATIONS
// ============================================

export function useCompleteSet() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const completeSet = useWorkoutStore(state => state.completeSet)
  const updateSetDbId = useWorkoutStore(state => state.updateSetDbId)
  const addPendingSet = useWorkoutStore(state => state.addPendingSet)

  return useMutation({
    mutationFn: async ({ sessionExerciseId, setNumber, weight, weightUnit, repsCompleted, timeSeconds, distanceMeters, paceSeconds, rirActual, notes, videoUrl }) => {
      return upsertCompletedSet({
        sessionId,
        sessionExerciseId,
        setNumber,
        weight,
        weightUnit,
        repsCompleted,
        timeSeconds,
        distanceMeters,
        paceSeconds,
        rirActual,
        notes,
        videoUrl,
      })
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    onMutate: async (variables) => {
      completeSet(variables.sessionExerciseId, variables.setNumber, {
        weight: variables.weight,
        weightUnit: variables.weightUnit,
        repsCompleted: variables.repsCompleted,
        timeSeconds: variables.timeSeconds,
        distanceMeters: variables.distanceMeters,
        paceSeconds: variables.paceSeconds,
        rirActual: variables.rirActual,
        notes: variables.notes,
        videoUrl: variables.videoUrl,
        dbId: null,
      })

      return { sessionExerciseId: variables.sessionExerciseId, setNumber: variables.setNumber }
    },
    onSuccess: (data, variables) => {
      updateSetDbId(variables.sessionExerciseId, variables.setNumber, data.id)
      useWorkoutStore.getState().removePendingSet(variables.sessionExerciseId, variables.setNumber)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
    onError: (_error, variables) => {
      addPendingSet(variables.sessionExerciseId, variables.setNumber, {
        sessionId,
        sessionExerciseId: variables.sessionExerciseId,
        setNumber: variables.setNumber,
        weight: variables.weight,
        weightUnit: variables.weightUnit,
        repsCompleted: variables.repsCompleted,
        timeSeconds: variables.timeSeconds,
        distanceMeters: variables.distanceMeters,
        paceSeconds: variables.paceSeconds,
        rirActual: variables.rirActual,
        notes: variables.notes,
        videoUrl: variables.videoUrl,
      })
    },
  })
}

export function useSyncPendingSets() {
  const sessionId = useWorkoutStore(state => state.sessionId)
  const pendingSets = useWorkoutStore(state => state.pendingSets)
  const updateSetDbId = useWorkoutStore(state => state.updateSetDbId)
  const removePendingSet = useWorkoutStore(state => state.removePendingSet)
  const syncingRef = useRef(false)

  const syncPending = useCallback(async () => {
    const pending = useWorkoutStore.getState().pendingSets
    if (Object.keys(pending).length === 0 || syncingRef.current) return
    syncingRef.current = true

    for (const [_key, payload] of Object.entries(pending)) {
      try {
        const data = await upsertCompletedSet({
          sessionId: payload.sessionId,
          sessionExerciseId: payload.sessionExerciseId,
          setNumber: payload.setNumber,
          weight: payload.weight,
          weightUnit: payload.weightUnit,
          repsCompleted: payload.repsCompleted,
          timeSeconds: payload.timeSeconds,
          distanceMeters: payload.distanceMeters,
          paceSeconds: payload.paceSeconds,
          rirActual: payload.rirActual,
          notes: payload.notes,
          videoUrl: payload.videoUrl,
        })

        if (data) {
          updateSetDbId(payload.sessionExerciseId, payload.setNumber, data.id)
          removePendingSet(payload.sessionExerciseId, payload.setNumber)
        }
      } catch {
        // Seguira en la cola para el proximo intento
      }
    }
    syncingRef.current = false
  }, [updateSetDbId, removePendingSet])

  // Reintentar cada 10 segundos si hay pendientes
  const pendingCount = Object.keys(pendingSets).length
  useEffect(() => {
    if (!sessionId || pendingCount === 0) return

    syncPending()
    const interval = setInterval(syncPending, 10000)
    return () => clearInterval(interval)
  }, [sessionId, pendingCount, syncPending])

  // Reintentar cuando la app vuelve a primer plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncPending()
    })
    return () => subscription.remove()
  }, [syncPending])

  return Object.keys(pendingSets).length
}

export function useUpdateSetVideo() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const updateSetVideo = useWorkoutStore(state => state.updateSetVideo)

  return useMutation({
    mutationFn: async ({ sessionExerciseId, setNumber, videoUrl }) => {
      return updateSetVideoApi({ sessionId, sessionExerciseId, setNumber, videoUrl })
    },
    onSuccess: (data, variables) => {
      updateSetVideo(variables.sessionExerciseId, variables.setNumber, variables.videoUrl)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}

export function useUpdateSetDetails() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const updateSetDetails = useWorkoutStore(state => state.updateSetDetails)

  return useMutation({
    mutationFn: async ({ sessionExerciseId, setNumber, rirActual, notes, videoUrl }) => {
      await updateSetDetailsApi({ sessionId, sessionExerciseId, setNumber, rirActual, notes, videoUrl })
    },
    onSuccess: (_result, variables) => {
      updateSetDetails(variables.sessionExerciseId, variables.setNumber, {
        rirActual: variables.rirActual,
        notes: variables.notes,
      })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}

export function useUncompleteSet() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const uncompleteSet = useWorkoutStore(state => state.uncompleteSet)

  return useMutation({
    mutationFn: async ({ sessionExerciseId, setNumber }) => {
      await deleteCompletedSet({ sessionId, sessionExerciseId, setNumber })
    },
    onSuccess: (_, variables) => {
      uncompleteSet(variables.sessionExerciseId, variables.setNumber)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}
