import { useRef, useEffect } from 'react'
import { AppState } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS, buildSessionExercisesCache, buildSessionExercisesFromBlocks } from '@gym/shared'
import useWorkoutStore from '../stores/workoutStore.js'

// ============================================
// SESSION RESTORATION
// ============================================

async function fetchActiveSession() {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, routine_day_id, started_at, routine_days(routine_id)')
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data
}

async function fetchCompletedSets(sessionId) {
  const { data } = await supabase
    .from('completed_sets')
    .select('session_exercise_id, set_number, weight, weight_unit, reps_completed, time_seconds, distance_meters, pace_seconds, rir_actual, notes, video_url')
    .eq('session_id', sessionId)

  const setsMap = {}
  for (const set of (data || [])) {
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

export function useRestoreActiveSession() {
  const syncRef = useRef()
  syncRef.current = async () => {
    const { sessionId: localSessionId, restoreSession, endSession } = useWorkoutStore.getState()
    const activeSession = await fetchActiveSession()

    if (!localSessionId) {
      if (!activeSession) return
      const completedSets = await fetchCompletedSets(activeSession.id)
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
  }

  useEffect(() => {
    syncRef.current()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncRef.current()
    })

    return () => subscription.remove()
  }, [])
}

// ============================================
// SESSION MUTATIONS
// ============================================

export function useStartSession() {
  const queryClient = useQueryClient()
  const startSession = useWorkoutStore(state => state.startSession)

  return useMutation({
    mutationFn: async ({ routineDayId = null, routineName = null, dayName = null, blocks = [] } = {}) => {
      const exercises = buildSessionExercisesFromBlocks(blocks)

      const { data, error } = await supabase.rpc('start_workout_session', {
        p_routine_day_id: routineDayId,
        p_routine_name: routineName,
        p_day_name: dayName,
        p_exercises: exercises,
      })

      if (error) throw error
      return data
    },
    onSuccess: (data, { routineDayId = null, routineId = null, blocks = [] } = {}) => {
      startSession(data.id, routineDayId, routineId)

      // Pre-popular cache de session_exercises para evitar segundo fetch
      if (data.session_exercises?.length > 0) {
        const cacheData = buildSessionExercisesCache(data.session_exercises, blocks)
        queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, data.id], cacheData)
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
    },
    onError: () => {
      useWorkoutStore.getState().hideWorkout()
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
      const { data: exercisesWithSets } = await supabase
        .from('completed_sets')
        .select('session_exercise_id')
        .eq('session_id', sessionId)

      const exerciseIdsWithSets = new Set(
        (exercisesWithSets || []).map(s => s.session_exercise_id)
      )

      if (exerciseIdsWithSets.size > 0) {
        // Eliminar ejercicios sin series completadas
        await supabase
          .from('session_exercises')
          .delete()
          .eq('session_id', sessionId)
          .not('id', 'in', `(${Array.from(exerciseIdsWithSets).join(',')})`)
      }

      const completedAt = new Date()
      const startedAtDate = new Date(startedAt)
      const durationMinutes = Math.round((completedAt - startedAtDate) / 60000)

      const { data, error } = await supabase
        .from('workout_sessions')
        .update({
          completed_at: completedAt.toISOString(),
          duration_minutes: durationMinutes,
          status: 'completed',
          overall_feeling: overallFeeling,
          notes,
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error
      return data
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
      // Eliminar la sesión (session_exercises y completed_sets se eliminan en cascada por FK)
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error
    },
    onSuccess: () => {
      endSession()
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES] })
    },
  })
}
