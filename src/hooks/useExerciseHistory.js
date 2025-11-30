import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'

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
          notas,
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
