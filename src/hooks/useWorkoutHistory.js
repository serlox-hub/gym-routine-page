import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'

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
        .gte('started_at', from)
        .lte('started_at', to)
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
              deleted_at,
              time_unit,
              distance_unit,
              muscle_group:muscle_groups (
                id,
                name
              )
            ),
            completed_sets (
              id,
              set_number,
              weight,
              weight_unit,
              reps_completed,
              time_seconds,
              distance_meters,
              pace_seconds,
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

export function useExerciseHistorySummary(exerciseId, routineDayId = null) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_HISTORY, 'summary', exerciseId, routineDayId],
    queryFn: async () => {
      let query = supabase
        .from('session_exercises')
        .select(`
          id,
          session:workout_sessions!inner (
            id,
            started_at,
            status,
            routine_day_id
          ),
          completed_sets!inner (
            weight,
            reps_completed,
            time_seconds,
            distance_meters,
            pace_seconds,
            set_number
          )
        `)
        .eq('exercise_id', exerciseId)
        .eq('session.status', 'completed')
        .order('session(started_at)', { ascending: false })

      if (routineDayId) {
        query = query.eq('session.routine_day_id', routineDayId)
      }

      const { data, error } = await query

      if (error) throw error

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

      let query = supabase
        .from('session_exercises')
        .select(`
          id,
          session:workout_sessions!inner (
            id,
            started_at,
            status,
            routine_day_id
          ),
          completed_sets!inner (
            id,
            set_number,
            weight,
            weight_unit,
            reps_completed,
            time_seconds,
            distance_meters,
            pace_seconds,
            rir_actual,
            notes,
            performed_at
          )
        `)
        .eq('exercise_id', exerciseId)
        .eq('session.status', 'completed')
        .order('session(started_at)', { ascending: false })
        .range(from, to)

      if (routineDayId) {
        query = query.eq('session.routine_day_id', routineDayId)
      }

      const { data, error } = await query

      if (error) throw error

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
      const { data, error } = await supabase
        .from('session_exercises')
        .select(`
          id,
          session:workout_sessions!inner (
            id,
            started_at,
            status
          ),
          completed_sets!inner (
            set_number,
            weight,
            weight_unit,
            reps_completed,
            time_seconds,
            distance_meters,
            pace_seconds,
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
