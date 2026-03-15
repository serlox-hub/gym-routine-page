import { useRef, useCallback, useEffect } from 'react'
import { AppState } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '@gym/shared'
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
      const { data, error } = await supabase
        .from('completed_sets')
        .upsert({
          session_id: sessionId,
          session_exercise_id: sessionExerciseId,
          set_number: setNumber,
          weight,
          weight_unit: weightUnit,
          reps_completed: repsCompleted,
          time_seconds: timeSeconds,
          distance_meters: distanceMeters,
          pace_seconds: paceSeconds,
          rir_actual: rirActual,
          notes,
          video_url: videoUrl,
          completed: true,
        }, {
          onConflict: 'session_id,session_exercise_id,set_number',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    onMutate: async (variables) => {
      // Optimistic update: marcar serie como completada inmediatamente
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
        dbId: null, // Temporal hasta confirmación del servidor
      })

      return { sessionExerciseId: variables.sessionExerciseId, setNumber: variables.setNumber }
    },
    onSuccess: (data, variables) => {
      // Actualizar con el dbId real del servidor
      updateSetDbId(variables.sessionExerciseId, variables.setNumber, data.id)
      useWorkoutStore.getState().removePendingSet(variables.sessionExerciseId, variables.setNumber)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
    onError: (_error, variables) => {
      // No hacer rollback — mantener el optimistic update y encolar para reintentar
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
        const { data, error } = await supabase
          .from('completed_sets')
          .upsert({
            session_id: payload.sessionId,
            session_exercise_id: payload.sessionExerciseId,
            set_number: payload.setNumber,
            weight: payload.weight,
            weight_unit: payload.weightUnit,
            reps_completed: payload.repsCompleted,
            time_seconds: payload.timeSeconds,
            distance_meters: payload.distanceMeters,
            pace_seconds: payload.paceSeconds,
            rir_actual: payload.rirActual,
            notes: payload.notes,
            video_url: payload.videoUrl,
            completed: true,
          }, {
            onConflict: 'session_id,session_exercise_id,set_number',
          })
          .select()
          .single()

        if (!error && data) {
          updateSetDbId(payload.sessionExerciseId, payload.setNumber, data.id)
          removePendingSet(payload.sessionExerciseId, payload.setNumber)
        }
      } catch {
        // Seguirá en la cola para el próximo intento
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
      const { data, error } = await supabase
        .from('completed_sets')
        .update({ video_url: videoUrl })
        .eq('session_id', sessionId)
        .eq('session_exercise_id', sessionExerciseId)
        .eq('set_number', setNumber)
        .select()
        .single()

      if (error) throw error
      return data
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
      const updateData = {
        rir_actual: rirActual,
        notes,
      }
      if (videoUrl !== undefined) {
        updateData.video_url = videoUrl
      }

      const { error } = await supabase
        .from('completed_sets')
        .update(updateData)
        .eq('session_id', sessionId)
        .eq('session_exercise_id', sessionExerciseId)
        .eq('set_number', setNumber)

      if (error) throw error
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
      const { error } = await supabase
        .from('completed_sets')
        .delete()
        .eq('session_id', sessionId)
        .eq('session_exercise_id', sessionExerciseId)
        .eq('set_number', setNumber)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      uncompleteSet(variables.sessionExerciseId, variables.setNumber)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}
