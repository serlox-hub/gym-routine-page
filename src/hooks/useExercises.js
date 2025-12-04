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
        .select(`
          id,
          nombre,
          measurement_type,
          instrucciones,
          altura_polea,
          equipment:equipment(id, nombre),
          grip_type:grip_types(id, nombre),
          grip_width:grip_widths(id, nombre)
        `)
        .order('nombre')

      if (error) throw error
      return data
    },
  })
}

export function useExercisesWithMuscles() {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, 'with-muscles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          id,
          nombre,
          measurement_type,
          equipment:equipment(id, nombre),
          exercise_muscles(
            es_principal,
            muscle:muscles(
              id,
              nombre,
              muscle_group:muscle_groups(id, nombre)
            )
          )
        `)
        .order('nombre')

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
        .select('id, nombre')
        .order('nombre')

      if (error) throw error
      return data
    },
  })
}

export function useMuscles() {
  return useQuery({
    queryKey: ['muscles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('muscles')
        .select(`
          id,
          nombre,
          muscle_group_id,
          muscle_group:muscle_groups(nombre)
        `)
        .order('nombre')

      if (error) throw error
      return data
    },
  })
}

export function useEquipment() {
  return useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          id,
          nombre,
          default_weight_unit,
          equipment_type:equipment_types(nombre)
        `)
        .order('nombre')

      if (error) throw error
      return data
    },
  })
}

export function useGripTypes() {
  return useQuery({
    queryKey: ['grip-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grip_types')
        .select('id, nombre')
        .order('nombre')

      if (error) throw error
      return data
    },
  })
}

export function useGripWidths() {
  return useQuery({
    queryKey: ['grip-widths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grip_widths')
        .select('id, nombre')
        .order('nombre')

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
          nombre,
          measurement_type,
          instrucciones,
          altura_polea,
          equipment_id,
          grip_type_id,
          grip_width_id,
          equipment:equipment(id, nombre, equipment_type:equipment_types(nombre)),
          grip_type:grip_types(id, nombre),
          grip_width:grip_widths(id, nombre),
          exercise_muscles(
            muscle_id,
            es_principal,
            muscle:muscles(id, nombre)
          )
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
    mutationFn: async ({ exercise, muscles }) => {
      const { data: newExercise, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          nombre: exercise.nombre,
          equipment_id: exercise.equipment_id || null,
          grip_type_id: exercise.grip_type_id || null,
          grip_width_id: exercise.grip_width_id || null,
          altura_polea: exercise.altura_polea || null,
          instrucciones: exercise.instrucciones || null,
          measurement_type: exercise.measurement_type || 'weight_reps',
          user_id: userId,
        })
        .select()
        .single()

      if (exerciseError) throw exerciseError

      if (muscles && muscles.length > 0) {
        const exerciseMuscles = muscles.map(m => ({
          exercise_id: newExercise.id,
          muscle_id: m.muscle_id,
          es_principal: m.es_principal,
        }))

        const { error: musclesError } = await supabase
          .from('exercise_muscles')
          .insert(exerciseMuscles)

        if (musclesError) throw musclesError
      }

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
    mutationFn: async ({ exerciseId, exercise, muscles }) => {
      // Actualizar ejercicio
      const { error: exerciseError } = await supabase
        .from('exercises')
        .update({
          nombre: exercise.nombre,
          equipment_id: exercise.equipment_id || null,
          grip_type_id: exercise.grip_type_id || null,
          grip_width_id: exercise.grip_width_id || null,
          altura_polea: exercise.altura_polea || null,
          instrucciones: exercise.instrucciones || null,
          measurement_type: exercise.measurement_type || 'weight_reps',
        })
        .eq('id', exerciseId)

      if (exerciseError) throw exerciseError

      // Eliminar músculos existentes y añadir los nuevos
      const { error: deleteError } = await supabase
        .from('exercise_muscles')
        .delete()
        .eq('exercise_id', exerciseId)

      if (deleteError) throw deleteError

      if (muscles && muscles.length > 0) {
        const exerciseMuscles = muscles.map(m => ({
          exercise_id: exerciseId,
          muscle_id: m.muscle_id,
          es_principal: m.es_principal,
        }))

        const { error: musclesError } = await supabase
          .from('exercise_muscles')
          .insert(exerciseMuscles)

        if (musclesError) throw musclesError
      }

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
