import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'

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

export function useCreateExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ exercise, muscles }) => {
      // Crear ejercicio
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
        })
        .select()
        .single()

      if (exerciseError) throw exerciseError

      // Añadir músculos si se especificaron
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
