import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'

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
          notas,
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
            notes: set.notas
          }))
          .sort((a, b) => a.setNumber - b.setNumber)
      }
    },
    enabled: !!exerciseId,
    staleTime: 1000 * 60 * 10
  })
}
