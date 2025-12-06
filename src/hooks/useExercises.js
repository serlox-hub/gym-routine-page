import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { useUserId } from './useAuth.js'

export function useExercises() {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, measurement_type, instructions, weight_unit')
        .order('name')

      if (error) throw error
      return data
    },
  })
}

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
          muscle_group_id,
          muscle_group:muscle_groups(id, name)
        `)
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
          instructions,
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
          measurement_type: exercise.measurement_type || 'weight_reps',
          weight_unit: exercise.weight_unit || 'kg',
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
          measurement_type: exercise.measurement_type || 'weight_reps',
          weight_unit: exercise.weight_unit || 'kg',
          muscle_group_id: muscleGroupId || null,
        })
        .eq('id', exerciseId)

      if (exerciseError) throw exerciseError

      return { id: exerciseId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES, data.id] })
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

      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) throw error
      return exerciseId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
    },
  })
}
