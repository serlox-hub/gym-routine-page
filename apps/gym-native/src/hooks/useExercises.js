import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { MeasurementType, QUERY_KEYS } from '@gym/shared'
import { useUserId } from './useAuth.js'

export function useExercisesWithMuscleGroup() {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, 'with-muscle-group'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          id,
          name,
          measurement_type,
          weight_unit,
          time_unit,
          distance_unit,
          muscle_group_id,
          muscle_group:muscle_groups(id, name)
        `)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      return data
    },
  })
}

export function useMuscleGroups() {
  return useQuery({
    queryKey: ['muscle-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('muscle_groups')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data
    },
  })
}

export function useExerciseStats() {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_USAGE_COUNTS],
    queryFn: async () => {
      const [sessionRes, routineRes] = await Promise.all([
        supabase.from('session_exercises').select('exercise_id'),
        supabase.from('routine_exercises').select('exercise_id, routine_block:routine_blocks(routine_day:routine_days(routine_id))'),
      ])

      if (sessionRes.error) throw sessionRes.error
      if (routineRes.error) throw routineRes.error

      const sessionCounts = {}
      for (const row of sessionRes.data) {
        sessionCounts[row.exercise_id] = (sessionCounts[row.exercise_id] || 0) + 1
      }

      const routineCounts = {}
      const routineSeen = {}
      for (const row of routineRes.data) {
        const routineId = row.routine_block?.routine_day?.routine_id
        const key = `${row.exercise_id}-${routineId}`
        if (!routineSeen[key]) {
          routineSeen[key] = true
          routineCounts[row.exercise_id] = (routineCounts[row.exercise_id] || 0) + 1
        }
      }

      return { sessionCounts, routineCounts }
    },
  })
}

// ============================================
// USAGE DETAIL
// ============================================

export function useExerciseUsageDetail(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_USAGE_DETAIL, exerciseId],
    queryFn: async () => {
      const [routineRes, sessionRes] = await Promise.all([
        supabase
          .from('routine_exercises')
          .select(`
            id,
            routine_block:routine_blocks(
              routine_day:routine_days(
                name,
                routine:routines(id, name)
              )
            )
          `)
          .eq('exercise_id', exerciseId),
        supabase
          .from('session_exercises')
          .select(`
            id,
            workout_session:workout_sessions!inner(id, started_at, routine_name)
          `)
          .eq('exercise_id', exerciseId)
          .eq('workout_session.status', 'completed')
          .order('id', { ascending: false }),
      ])

      if (routineRes.error) throw routineRes.error
      if (sessionRes.error) throw sessionRes.error

      const routines = routineRes.data
        .map(re => {
          const day = re.routine_block?.routine_day
          const routine = day?.routine
          if (!routine) return null
          return { routineId: routine.id, routineName: routine.name, dayName: day.name }
        })
        .filter(Boolean)

      const seen = new Set()
      const uniqueRoutines = routines.filter(r => {
        const key = `${r.routineId}-${r.dayName}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const sessions = sessionRes.data
        .filter(se => se.workout_session)
        .map(se => ({
          sessionId: se.workout_session.id,
          date: se.workout_session.started_at,
          routineName: se.workout_session.routine_name,
        }))

      const seenSessions = new Set()
      const uniqueSessions = sessions.filter(s => {
        if (seenSessions.has(s.sessionId)) return false
        seenSessions.add(s.sessionId)
        return true
      })

      return { routines: uniqueRoutines, sessions: uniqueSessions }
    },
    enabled: !!exerciseId,
  })
}

export function useExercise(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          id,
          name,
          measurement_type,
          weight_unit,
          time_unit,
          distance_unit,
          instructions,
          deleted_at,
          muscle_group_id,
          muscle_group:muscle_groups(id, name)
        `)
        .eq('id', exerciseId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!exerciseId,
  })
}

export function useCreateExercise() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ exercise, muscleGroupId }) => {
      const { data: newExercise, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          name: exercise.name,
          instructions: exercise.instructions || null,
          measurement_type: exercise.measurement_type || MeasurementType.WEIGHT_REPS,
          weight_unit: exercise.weight_unit || 'kg',
          time_unit: exercise.time_unit || 's',
          distance_unit: exercise.distance_unit || 'm',
          muscle_group_id: muscleGroupId || null,
          user_id: userId,
        })
        .select()
        .single()

      if (exerciseError) throw exerciseError

      return newExercise
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
    },
  })
}

export function useUpdateExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ exerciseId, exercise, muscleGroupId }) => {
      const { error: exerciseError } = await supabase
        .from('exercises')
        .update({
          name: exercise.name,
          instructions: exercise.instructions || null,
          measurement_type: exercise.measurement_type || MeasurementType.WEIGHT_REPS,
          weight_unit: exercise.weight_unit || 'kg',
          time_unit: exercise.time_unit || 's',
          distance_unit: exercise.distance_unit || 'm',
          muscle_group_id: muscleGroupId || null,
        })
        .eq('id', exerciseId)

      if (exerciseError) throw exerciseError

      return { id: exerciseId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES, data.id] })
      // Invalidar rutinas que pueden contener este ejercicio
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_ALL_EXERCISES] })
    },
  })
}

export function useDeleteExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (exerciseId) => {
      // Verificar si el ejercicio está en alguna rutina
      const { data: usedInRoutines, error: checkError } = await supabase
        .from('routine_exercises')
        .select('id')
        .eq('exercise_id', exerciseId)
        .limit(1)

      if (checkError) throw checkError

      if (usedInRoutines && usedInRoutines.length > 0) {
        throw new Error('Este ejercicio está siendo usado en una rutina. Elimínalo de la rutina primero.')
      }

      // Soft delete: marcar como eliminado en lugar de borrar
      const { error } = await supabase
        .from('exercises')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', exerciseId)

      if (error) throw error
      return exerciseId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
    },
  })
}
