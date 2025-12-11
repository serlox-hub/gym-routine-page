import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'
import useWorkoutStore from '../stores/workoutStore.js'
import { useUserId } from './useAuth.js'
import { buildSessionExercisesFromBlocks } from '../lib/workoutTransforms.js'

// ============================================
// SESSION MUTATIONS
// ============================================

export function useStartSession() {
  const queryClient = useQueryClient()
  const startSession = useWorkoutStore(state => state.startSession)
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ routineDayId = null, routineName = null, dayName = null, blocks = [] } = {}) => {
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          routine_day_id: routineDayId,
          routine_name: routineName,
          day_name: dayName,
          status: 'in_progress',
          user_id: userId,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      const sessionExercisesData = buildSessionExercisesFromBlocks(blocks)

      if (sessionExercisesData.length > 0) {
        const { error: exercisesError } = await supabase
          .from('session_exercises')
          .insert(
            sessionExercisesData.map(se => ({
              ...se,
              session_id: session.id,
            }))
          )

        if (exercisesError) throw exercisesError
      }

      return session
    },
    onSuccess: (data, { routineDayId = null, routineId = null } = {}) => {
      startSession(data.id, routineDayId, routineId)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_SESSION] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES] })
    },
  })
}

export function useCompleteSet() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const completeSet = useWorkoutStore(state => state.completeSet)
  const updateSetDbId = useWorkoutStore(state => state.updateSetDbId)
  const rollbackSet = useWorkoutStore(state => state.rollbackSet)

  return useMutation({
    mutationFn: async ({ sessionExerciseId, setNumber, weight, weightUnit, repsCompleted, timeSeconds, distanceMeters, rirActual, notes, videoUrl }) => {
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
    onMutate: async (variables) => {
      // Optimistic update: marcar serie como completada inmediatamente
      completeSet(variables.sessionExerciseId, variables.setNumber, {
        weight: variables.weight,
        weightUnit: variables.weightUnit,
        repsCompleted: variables.repsCompleted,
        timeSeconds: variables.timeSeconds,
        distanceMeters: variables.distanceMeters,
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
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
    onError: (error, variables, context) => {
      // Rollback: revertir el optimistic update
      if (context) {
        rollbackSet(context.sessionExerciseId, context.setNumber)
      }
      // Mostrar error al usuario
      alert('Error al guardar la serie. Por favor, inténtalo de nuevo.')
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

// ============================================
// SESSION EXERCISES QUERIES & MUTATIONS
// ============================================

export function useSessionExercises(sessionId) {
  return useQuery({
    queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_exercises')
        .select(`
          id,
          exercise_id,
          routine_exercise_id,
          sort_order,
          series,
          reps,
          rir,
          rest_seconds,
          tempo,
          notes,
          superset_group,
          is_extra,
          block_name,
          exercise:exercises (
            id,
            name,
            measurement_type,
            weight_unit,
            muscle_group:muscle_groups (
              id,
              name
            )
          )
        `)
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!sessionId,
  })
}

export function useAddSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  return useMutation({
    mutationFn: async ({ exercise, series, reps, rir, rest_seconds, notes, tempo, superset_group }) => {
      // Obtener todos los ejercicios de la sesión para calcular posición
      const { data: existing } = await supabase
        .from('session_exercises')
        .select('id, sort_order, superset_group')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true })

      let insertSortOrder
      let blockName = 'Principal'

      if (superset_group && existing?.length) {
        // Si se asigna a un superset, insertar después del último ejercicio del superset
        const supersetExercises = existing.filter(e => e.superset_group === superset_group)

        if (supersetExercises.length > 0) {
          // Encontrar la posición del último ejercicio del superset
          const lastSupersetExercise = supersetExercises[supersetExercises.length - 1]
          insertSortOrder = lastSupersetExercise.sort_order + 1

          // Usar el mismo bloque que el superset (buscar en existing)
          const supersetMember = existing.find(e => e.superset_group === superset_group)
          if (supersetMember) {
            // Necesitamos obtener el block_name del superset
            const { data: memberData } = await supabase
              .from('session_exercises')
              .select('block_name')
              .eq('id', supersetMember.id)
              .single()
            if (memberData?.block_name) {
              blockName = memberData.block_name
            }
          }

          // Desplazar los ejercicios posteriores
          const exercisesToShift = existing.filter(e => e.sort_order >= insertSortOrder)
          if (exercisesToShift.length > 0) {
            const updates = exercisesToShift.map(e =>
              supabase
                .from('session_exercises')
                .update({ sort_order: e.sort_order + 1 })
                .eq('id', e.id)
            )
            await Promise.all(updates)
          }
        } else {
          // Superset nuevo, añadir al final
          insertSortOrder = (existing[existing.length - 1]?.sort_order || 0) + 1
        }
      } else {
        // Sin superset, añadir al final
        insertSortOrder = (existing?.[existing.length - 1]?.sort_order || 0) + 1
      }

      const { data, error } = await supabase
        .from('session_exercises')
        .insert({
          session_id: sessionId,
          exercise_id: exercise.id,
          routine_exercise_id: null,
          sort_order: insertSortOrder,
          series: series || 3,
          reps: reps || '10',
          rir,
          rest_seconds,
          tempo,
          notes,
          superset_group,
          is_extra: true,
          block_name: blockName,
        })
        .select(`
          id,
          exercise_id,
          sort_order,
          series,
          reps,
          rir,
          rest_seconds,
          tempo,
          notes,
          superset_group,
          is_extra,
          block_name,
          exercise:exercises (
            id,
            name,
            measurement_type,
            weight_unit
          )
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
    },
  })
}

export function useRemoveSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  return useMutation({
    mutationFn: async (sessionExerciseId) => {
      const { error } = await supabase
        .from('session_exercises')
        .delete()
        .eq('id', sessionExerciseId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}

export function useReorderSessionExercises() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  return useMutation({
    mutationFn: async (orderedExerciseIds) => {
      // Actualizar sort_order para cada ejercicio
      const updates = orderedExerciseIds.map((id, index) =>
        supabase
          .from('session_exercises')
          .update({ sort_order: index + 1 })
          .eq('id', id)
      )

      const results = await Promise.all(updates)
      const errors = results.filter(r => r.error)
      if (errors.length > 0) throw errors[0].error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
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
      return sessionId
    },
    onSuccess: (sessionId) => {
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
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
          routine_name,
          day_name,
          routine_day:routine_days (
            id,
            name,
            routine:routines (
              id,
              name
            )
          ),
          session_exercises (
            id,
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
      // Obtener sesión con info del día y ejercicios
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
          routine_name,
          day_name,
          routine_day:routine_days (
            id,
            name,
            routine:routines (
              id,
              name
            )
          ),
          session_exercises (
            id,
            sort_order,
            series,
            reps,
            is_extra,
            block_name,
            exercise:exercises (
              id,
              name,
              deleted_at
            ),
            completed_sets (
              id,
              set_number,
              weight,
              weight_unit,
              reps_completed,
              time_seconds,
              distance_meters,
              rir_actual,
              notes,
              video_url,
              performed_at
            )
          )
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

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

export function useExerciseHistory(exerciseId, routineDayId = null) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, exerciseId, routineDayId],
    queryFn: async () => {
      // Buscar session_exercises que tengan este ejercicio en sesiones completadas
      const query = supabase
        .from('session_exercises')
        .select(`
          id,
          session:workout_sessions!inner (
            id,
            started_at,
            status,
            routine_day_id
          ),
          completed_sets (
            id,
            set_number,
            weight,
            weight_unit,
            reps_completed,
            time_seconds,
            distance_meters,
            rir_actual,
            notes,
            performed_at
          )
        `)
        .eq('exercise_id', exerciseId)
        .eq('session.status', 'completed')
        .order('session(started_at)', { ascending: false })
        .limit(50)

      const { data, error } = await query

      if (error) throw error

      // Filtrar por routine_day_id si se especifica
      let filteredData = data
      if (routineDayId) {
        filteredData = data.filter(se => se.session.routine_day_id === routineDayId)
      }

      // Transformar a formato esperado
      return filteredData
        .filter(se => se.completed_sets && se.completed_sets.length > 0)
        .map(se => ({
          sessionId: se.session.id,
          date: se.session.started_at,
          sets: se.completed_sets.sort((a, b) => a.set_number - b.set_number)
        }))
    },
    enabled: !!exerciseId,
  })
}

export function usePreviousWorkout(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.PREVIOUS_WORKOUT, exerciseId],
    queryFn: async () => {
      // Buscar la sesión más reciente con este ejercicio
      const { data, error } = await supabase
        .from('session_exercises')
        .select(`
          id,
          session:workout_sessions!inner (
            id,
            started_at,
            status
          ),
          completed_sets (
            set_number,
            weight,
            weight_unit,
            reps_completed,
            time_seconds,
            distance_meters,
            rir_actual,
            notes,
            performed_at
          )
        `)
        .eq('exercise_id', exerciseId)
        .eq('session.status', 'completed')
        .order('session(started_at)', { ascending: false })
        .limit(1)

      if (error) throw error
      if (!data || data.length === 0) return null

      const lastSession = data[0]
      if (!lastSession.completed_sets || lastSession.completed_sets.length === 0) {
        return null
      }

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

export function useRestTimer() {
  const restTimerActive = useWorkoutStore(state => state.restTimerActive)
  const restTimeRemaining = useWorkoutStore(state => state.restTimeRemaining)
  const restTimeInitial = useWorkoutStore(state => state.restTimeInitial)
  const tickTimer = useWorkoutStore(state => state.tickTimer)
  const skipRest = useWorkoutStore(state => state.skipRest)
  const adjustRestTime = useWorkoutStore(state => state.adjustRestTime)

  const intervalRef = useRef(null)

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

// ============================================
// WAKE LOCK HOOK
// ============================================

export function useWakeLock() {
  const [isSupported] = useState(() => 'wakeLock' in navigator)
  const [isActive, setIsActive] = useState(false)
  const wakeLockRef = useRef(null)

  const request = useCallback(async () => {
    if (!isSupported || wakeLockRef.current) return

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      setIsActive(true)

      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false)
        wakeLockRef.current = null
      })
    } catch {
      // Wake lock request failed (e.g., low battery, tab not visible)
    }
  }, [isSupported])

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
      setIsActive(false)
    }
  }, [])

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSupported && !wakeLockRef.current) {
        request()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isSupported, request])

  // Request on mount, release on unmount
  useEffect(() => {
    request()
    return () => { release() }
  }, [request, release])

  return { isSupported, isActive }
}
