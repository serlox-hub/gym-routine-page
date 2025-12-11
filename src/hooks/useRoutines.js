import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { useUserId } from './useAuth.js'
import { duplicateRoutine } from '../lib/routineIO.js'

export function useRoutines() {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINES],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('id')
      if (error) throw error
      return data
    }
  })
}

export function useRoutine(routineId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE, routineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('id', routineId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!routineId
  })
}

export function useRoutineDays(routineId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_DAYS, routineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routine_days')
        .select('*')
        .eq('routine_id', routineId)
        .order('sort_order')
      if (error) throw error
      return data
    },
    enabled: !!routineId
  })
}

export function useRoutineDay(dayId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_DAY, dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routine_days')
        .select(`
          *,
          routine:routines(name)
        `)
        .eq('id', dayId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!dayId
  })
}

export function useRoutineBlocks(dayId) {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(dayId)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routine_blocks')
        .select(`
          *,
          routine_exercises (
            *,
            exercise:exercises (
              id,
              name,
              measurement_type,
              weight_unit,
              instructions
            )
          )
        `)
        .eq('routine_day_id', dayId)
        .order('sort_order')
      if (error) throw error

      // Ordenar bloques: Calentamiento siempre primero, luego por sort_order
      const sortedBlocks = data.sort((a, b) => {
        if (a.name === 'Calentamiento') return -1
        if (b.name === 'Calentamiento') return 1
        return a.sort_order - b.sort_order
      })

      return sortedBlocks.map(block => ({
        ...block,
        routine_exercises: block.routine_exercises.sort((a, b) => a.sort_order - b.sort_order)
      }))
    },
    enabled: !!dayId
  })
}

export function useCreateRoutine() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async (routine) => {
      const { data, error } = await supabase
        .from('routines')
        .insert({
          name: routine.name,
          description: routine.description || null,
          goal: routine.goal || null,
          user_id: userId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useCreateRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ routineId, day }) => {
      const { data, error } = await supabase
        .from('routine_days')
        .insert({
          routine_id: routineId,
          name: day.name,
          estimated_duration_min: day.estimated_duration_min || null,
          sort_order: day.sort_order,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ routineId, data }) => {
      const { data: updated, error } = await supabase
        .from('routines')
        .update(data)
        .eq('id', routineId)
        .select()
        .single()

      if (error) throw error
      return updated
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE, variables.routineId] })
    },
  })
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (routineId) => {
      const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useDeleteRoutines() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (routineIds) => {
      const { error } = await supabase
        .from('routines')
        .delete()
        .in('id', routineIds)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useSetFavoriteRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ routineId, isFavorite }) => {
      // Si se marca como favorita, quitar favorito de las demás
      if (isFavorite) {
        await supabase
          .from('routines')
          .update({ is_favorite: false })
          .neq('id', routineId)
      }

      const { error } = await supabase
        .from('routines')
        .update({ is_favorite: isFavorite })
        .eq('id', routineId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useUpdateRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dayId, data }) => {
      const { error } = await supabase
        .from('routine_days')
        .update(data)
        .eq('id', dayId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useDeleteRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dayId }) => {
      const { error } = await supabase
        .from('routine_days')
        .delete()
        .eq('id', dayId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useReorderRoutineDays() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ days }) => {
      const dayOrders = days.map((day, index) => ({
        id: day.id,
        sort_order: index + 1
      }))

      const { error } = await supabase.rpc('reorder_routine_days', {
        day_orders: dayOrders
      })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useDeleteRoutineExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ exerciseId }) => {
      const { error } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useUpdateRoutineExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ exerciseId, data }) => {
      const { error } = await supabase
        .from('routine_exercises')
        .update(data)
        .eq('id', exerciseId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useReorderRoutineExercises() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ exercises }) => {
      const exerciseOrders = exercises.map((exercise, index) => ({
        id: exercise.id,
        sort_order: index + 1
      }))

      const { error } = await supabase.rpc('reorder_routine_exercises', {
        exercise_orders: exerciseOrders
      })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useDuplicateRoutine() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ routineId, newName }) => {
      return duplicateRoutine(routineId, userId, newName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    },
  })
}

export function useAddExerciseToDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dayId, exerciseId, series, reps, rir, rest_seconds, notes, tempo, tempo_razon, esCalentamiento = false, superset_group }) => {
      const blockName = esCalentamiento ? 'Calentamiento' : 'Principal'

      // Primero buscar o crear el bloque correspondiente
      const { data: existingBlock, error: blockFetchError } = await supabase
        .from('routine_blocks')
        .select('id, sort_order')
        .eq('routine_day_id', dayId)
        .eq('name', blockName)
        .single()

      if (blockFetchError && blockFetchError.code !== 'PGRST116') {
        throw blockFetchError
      }

      let blockId
      if (!existingBlock) {
        // Para calentamiento, sort_order 1. Para principal, después del calentamiento si existe
        let nextOrder = 1
        if (!esCalentamiento) {
          const { data: maxOrderBlocks } = await supabase
            .from('routine_blocks')
            .select('sort_order')
            .eq('routine_day_id', dayId)
            .order('sort_order', { ascending: false })
            .limit(1)
          nextOrder = (maxOrderBlocks?.[0]?.sort_order || 0) + 1
        }

        const { data: newBlock, error: blockCreateError } = await supabase
          .from('routine_blocks')
          .insert({
            routine_day_id: dayId,
            name: blockName,
            sort_order: nextOrder,
          })
          .select()
          .single()

        if (blockCreateError) throw blockCreateError
        blockId = newBlock.id
      } else {
        blockId = existingBlock.id
      }

      // Obtener el máximo orden de ejercicios en el bloque
      const { data: maxOrderExercises } = await supabase
        .from('routine_exercises')
        .select('sort_order')
        .eq('routine_block_id', blockId)
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextExerciseOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

      // Insertar el ejercicio en el bloque
      const { data: newExercise, error: exerciseError } = await supabase
        .from('routine_exercises')
        .insert({
          routine_block_id: blockId,
          exercise_id: exerciseId,
          series: series || 3,
          reps: reps || '8-12',
          rir: rir ?? null,
          rest_seconds: rest_seconds || null,
          sort_order: nextExerciseOrder,
          notes: notes || null,
          tempo: tempo || null,
          tempo_razon: tempo_razon || null,
          superset_group: superset_group ?? null,
        })
        .select()
        .single()

      if (exerciseError) throw exerciseError
      return newExercise
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}
