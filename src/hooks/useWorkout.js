import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'
import useWorkoutStore from '../stores/workoutStore.js'

export function useStartSession() {
  const queryClient = useQueryClient()
  const startSession = useWorkoutStore(state => state.startSession)

  return useMutation({
    mutationFn: async (routineDayId) => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          routine_day_id: routineDayId,
          status: 'in_progress',
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
    mutationFn: async ({ routineExerciseId, exerciseId, setNumber, weight, weightUnit, repsCompleted, timeSeconds, distanceMeters, rirActual, notas }) => {
      // Para ejercicios extra (id empieza con "extra-"), routine_exercise_id es null
      const isExtraExercise = typeof routineExerciseId === 'string' && routineExerciseId.startsWith('extra-')

      const { data, error } = await supabase
        .from('completed_sets')
        .insert({
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
          notas,
          completed: true,
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
        notas: variables.notas,
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
    mutationFn: async ({ sensacionGeneral, notas }) => {
      const completedAt = new Date()
      const startedAtDate = new Date(startedAt)
      const durationMinutes = Math.round((completedAt - startedAtDate) / 60000)

      const { data, error } = await supabase
        .from('workout_sessions')
        .update({
          completed_at: completedAt.toISOString(),
          duration_minutes: durationMinutes,
          status: 'completed',
          sensacion_general: sensacionGeneral,
          notas,
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
