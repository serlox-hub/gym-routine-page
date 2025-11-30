import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'

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
          sensacion_general,
          notas,
          routine_day:routine_days (
            id,
            nombre,
            routine:routines (
              id,
              nombre
            )
          ),
          sets:completed_sets (
            id,
            weight,
            reps_completed
          )
        `)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data
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
          sensacion_general,
          notas,
          routine_day:routine_days (
            id,
            nombre,
            routine:routines (
              id,
              nombre
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
          notas,
          performed_at,
          exercise:exercises (
            id,
            nombre
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
