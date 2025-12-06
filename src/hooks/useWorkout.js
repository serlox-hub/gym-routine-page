import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'
import useWorkoutStore from '../stores/workoutStore.js'
import { useUserId } from './useAuth.js'

// ============================================
// SESSION MUTATIONS
// ============================================

export function useStartSession() {
  const queryClient = useQueryClient()
  const startSession = useWorkoutStore(state => state.startSession)
  const userId = useUserId()

  return useMutation({
    mutationFn: async (routineDayId) => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          routine_day_id: routineDayId,
          status: 'in_progress',
          user_id: userId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data, routineDayId) => {
      startSession(data.id, routineDayId)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
    },
  })
}

export function useCompleteSet() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const completeSet = useWorkoutStore(state => state.completeSet)

  return useMutation({
    mutationFn: async ({ routineExerciseId, exerciseId, setNumber, weight, weightUnit, repsCompleted, timeSeconds, distanceMeters, rirActual, notes }) => {
      // Para ejercicios extra (id empieza con "extra-"), routine_exercise_id es null
      const isExtraExercise = typeof routineExerciseId === 'string' && routineExerciseId.startsWith('extra-')

      const { data, error } = await supabase
        .from('completed_sets')
        .upsert({
          session_id: sessionId,
          routine_exercise_id: isExtraExercise ? null : routineExerciseId,
          exercise_id: exerciseId,
          set_number: setNumber,
          weight,
          weight_unit: weightUnit,
          reps_completed: repsCompleted,
          time_seconds: timeSeconds,
          distance_meters: distanceMeters,
          rir_actual: rirActual,
          notes,
          completed: true,
        }, {
          onConflict: 'session_id,exercise_id,set_number,routine_exercise_id',
        })
        .select()
        .single()

      if (error) throw error
      return { ...data, localExerciseId: routineExerciseId }
    },
    onSuccess: (data, variables) => {
      completeSet(variables.routineExerciseId, variables.setNumber, {
        weight: variables.weight,
        weightUnit: variables.weightUnit,
        repsCompleted: variables.repsCompleted,
        timeSeconds: variables.timeSeconds,
        distanceMeters: variables.distanceMeters,
        rirActual: variables.rirActual,
        notes: variables.notes,
        dbId: data.id,
      })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}

export function useUncompleteSet() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const uncompleteSet = useWorkoutStore(state => state.uncompleteSet)
  const getSetData = useWorkoutStore(state => state.getSetData)

  return useMutation({
    mutationFn: async ({ routineExerciseId, setNumber }) => {
      const isExtraExercise = typeof routineExerciseId === 'string' && routineExerciseId.startsWith('extra-')

      if (isExtraExercise) {
        // Para ejercicios extra, usar el dbId guardado en el store
        const setData = getSetData(routineExerciseId, setNumber)
        if (setData?.dbId) {
          const { error } = await supabase
            .from('completed_sets')
            .delete()
            .eq('id', setData.dbId)

          if (error) throw error
        }
      } else {
        const { error } = await supabase
          .from('completed_sets')
          .delete()
          .eq('session_id', sessionId)
          .eq('routine_exercise_id', routineExerciseId)
          .eq('set_number', setNumber)

        if (error) throw error
      }
    },
    onSuccess: (_, variables) => {
      uncompleteSet(variables.routineExerciseId, variables.setNumber)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
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
    },
  })
}

export function useAbandonSession() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const endSession = useWorkoutStore(state => state.endSession)

  return useMutation({
    mutationFn: async () => {
      // Eliminar la sesión (las series se eliminan en cascada por FK)
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
    },
  })
}

// ============================================
// HISTORY MUTATIONS
// ============================================

export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId) => {
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
    },
  })
}

// ============================================
// HISTORY QUERIES
// ============================================

export function useWorkoutHistory() {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKOUT_HISTORY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          started_at,
          completed_at,
          duration_minutes,
          status,
          overall_feeling,
          notes,
          routine_day:routine_days (
            id,
            name,
            routine:routines (
              id,
              name
            )
          ),
          sets:completed_sets (
            id,
            weight,
            reps_completed,
            exercise:exercises (
              id,
              muscle_group:muscle_groups (
                id,
                name
              )
            )
          )
        `)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })

      if (error) throw error

      // Extraer grupos musculares únicos de cada sesión
      return data.map(session => {
        const muscleGroupsSet = new Set()
        session.sets?.forEach(set => {
          if (set.exercise?.muscle_group?.name) {
            muscleGroupsSet.add(set.exercise.muscle_group.name)
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
      // Obtener sesión con info del día
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          started_at,
          completed_at,
          duration_minutes,
          status,
          overall_feeling,
          notes,
          routine_day:routine_days (
            id,
            name,
            routine:routines (
              id,
              name
            )
          )
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

      // Obtener series completadas
      const { data: sets, error: setsError } = await supabase
        .from('completed_sets')
        .select(`
          id,
          set_number,
          weight,
          weight_unit,
          reps_completed,
          time_seconds,
          distance_meters,
          rir_actual,
          notes,
          performed_at,
          exercise:exercises (
            id,
            name
          )
        `)
        .eq('session_id', sessionId)
        .order('performed_at', { ascending: true })

      if (setsError) throw setsError

      // Agrupar series por ejercicio
      const exerciseMap = new Map()
      sets.forEach(set => {
        const exerciseId = set.exercise.id
        if (!exerciseMap.has(exerciseId)) {
          exerciseMap.set(exerciseId, {
            exercise: set.exercise,
            sets: []
          })
        }
        exerciseMap.get(exerciseId).sets.push(set)
      })

      return {
        ...session,
        exercises: Array.from(exerciseMap.values())
      }
    },
    enabled: !!sessionId,
  })
}

// ============================================
// EXERCISE HISTORY QUERIES
// ============================================

export function useExerciseHistory(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('completed_sets')
        .select(`
          id,
          set_number,
          weight,
          weight_unit,
          reps_completed,
          time_seconds,
          distance_meters,
          rir_actual,
          notes,
          performed_at,
          session:workout_sessions!inner (
            id,
            started_at,
            status
          )
        `)
        .eq('exercise_id', exerciseId)
        .eq('session.status', 'completed')
        .order('performed_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Agrupar por sesión
      const sessionMap = new Map()
      data.forEach(set => {
        const sessionId = set.session.id
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            sessionId,
            date: set.session.started_at,
            sets: []
          })
        }
        sessionMap.get(sessionId).sets.push(set)
      })

      // Ordenar sets dentro de cada sesión
      const sessions = Array.from(sessionMap.values())
      sessions.forEach(session => {
        session.sets.sort((a, b) => a.set_number - b.set_number)
      })

      return sessions
    },
    enabled: !!exerciseId,
  })
}

export function usePreviousWorkout(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.PREVIOUS_WORKOUT, exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('completed_sets')
        .select(`
          set_number,
          weight,
          weight_unit,
          reps_completed,
          time_seconds,
          distance_meters,
          rir_actual,
          notes,
          performed_at,
          workout_sessions!inner (
            id,
            started_at,
            status
          )
        `)
        .eq('exercise_id', exerciseId)
        .eq('workout_sessions.status', 'completed')
        .order('performed_at', { ascending: false })
        .limit(20)

      if (error) throw error
      if (!data || data.length === 0) return null

      // Agrupar por sesión y tomar solo la más reciente
      const lastSessionId = data[0].workout_sessions.id
      const lastSessionSets = data.filter(
        set => set.workout_sessions.id === lastSessionId
      )

      return {
        date: data[0].workout_sessions.started_at,
        sets: lastSessionSets
          .map(set => ({
            setNumber: set.set_number,
            weight: set.weight,
            weightUnit: set.weight_unit,
            reps: set.reps_completed,
            timeSeconds: set.time_seconds,
            distanceMeters: set.distance_meters,
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
// REST TIMER HOOK
// ============================================

import { useEffect, useRef, useCallback } from 'react'

export function useRestTimer() {
  const restTimerActive = useWorkoutStore(state => state.restTimerActive)
  const restTimeRemaining = useWorkoutStore(state => state.restTimeRemaining)
  const restTimeInitial = useWorkoutStore(state => state.restTimeInitial)
  const tickTimer = useWorkoutStore(state => state.tickTimer)
  const skipRest = useWorkoutStore(state => state.skipRest)
  const adjustRestTime = useWorkoutStore(state => state.adjustRestTime)

  const intervalRef = useRef(null)
  const audioContextRef = useRef(null)

  // Timer interval - solo depende de restTimerActive para evitar múltiples intervalos
  useEffect(() => {
    if (restTimerActive) {
      // Limpiar cualquier intervalo previo antes de crear uno nuevo
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      intervalRef.current = setInterval(() => {
        tickTimer()
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [restTimerActive, tickTimer])

  // Alerta sonora cuando quedan 3 segundos
  useEffect(() => {
    if (restTimerActive && restTimeRemaining <= 3 && restTimeRemaining > 0) {
      playBeep()
    }
  }, [restTimeRemaining, restTimerActive])

  // Alerta cuando termina
  useEffect(() => {
    if (restTimerActive && restTimeRemaining === 0) {
      playBeep()
      // Vibración si está disponible
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }, [restTimerActive, restTimeRemaining])

  const playBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = 880 // A5 note
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.15)
    } catch {
      // Ignorar errores de audio
    }
  }, [])

  const progress = restTimeInitial > 0
    ? ((restTimeInitial - restTimeRemaining) / restTimeInitial) * 100
    : 0

  return {
    isActive: restTimerActive,
    timeRemaining: restTimeRemaining,
    timeInitial: restTimeInitial,
    progress,
    skip: skipRest,
    addTime: (delta) => adjustRestTime(delta),
  }
}
