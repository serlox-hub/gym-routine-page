import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { useUserId } from './useAuth.js'

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
        .order('orden')
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
          routine:routines(nombre)
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
              nombre,
              measurement_type,
              instrucciones
            )
          )
        `)
        .eq('routine_day_id', dayId)
        .order('orden')
      if (error) throw error

      // Ordenar bloques: Calentamiento siempre primero, luego por orden
      const sortedBlocks = data.sort((a, b) => {
        if (a.nombre === 'Calentamiento') return -1
        if (b.nombre === 'Calentamiento') return 1
        return a.orden - b.orden
      })

      return sortedBlocks.map(block => ({
        ...block,
        routine_exercises: block.routine_exercises.sort((a, b) => a.orden - b.orden)
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
          nombre: routine.nombre,
          descripcion: routine.descripcion || null,
          objetivo: routine.objetivo || null,
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
          nombre: day.nombre,
          duracion_estimada_min: day.duracion_estimada_min || null,
          orden: day.orden,
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

export function useUpdateRoutineDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dayId, routineId, data }) => {
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
    mutationFn: async ({ dayId, routineId }) => {
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
    mutationFn: async ({ routineId, days }) => {
      // Actualizar el orden de cada día
      for (let i = 0; i < days.length; i++) {
        const { error } = await supabase
          .from('routine_days')
          .update({ orden: i + 1 })
          .eq('id', days[i].id)
        if (error) throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, String(variables.routineId)] })
    },
  })
}

export function useDeleteRoutineExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ exerciseId, dayId }) => {
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
    mutationFn: async ({ exerciseId, dayId, data }) => {
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
    mutationFn: async ({ dayId, exercises }) => {
      // Actualizar el orden de cada ejercicio secuencialmente
      for (let i = 0; i < exercises.length; i++) {
        const { error } = await supabase
          .from('routine_exercises')
          .update({ orden: i + 1 })
          .eq('id', exercises[i].id)
        if (error) throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, String(variables.dayId)] })
    },
  })
}

export function useAddExerciseToDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dayId, exerciseId, series, reps, notas, tempo, tempo_razon, esCalentamiento = false }) => {
      const blockName = esCalentamiento ? 'Calentamiento' : 'Principal'

      // Primero buscar o crear el bloque correspondiente
      let { data: existingBlock, error: blockFetchError } = await supabase
        .from('routine_blocks')
        .select('id, orden')
        .eq('routine_day_id', dayId)
        .eq('nombre', blockName)
        .single()

      if (blockFetchError && blockFetchError.code !== 'PGRST116') {
        throw blockFetchError
      }

      let blockId
      if (!existingBlock) {
        // Para calentamiento, orden 1. Para principal, después del calentamiento si existe
        let nextOrder = 1
        if (!esCalentamiento) {
          const { data: maxOrderBlocks } = await supabase
            .from('routine_blocks')
            .select('orden')
            .eq('routine_day_id', dayId)
            .order('orden', { ascending: false })
            .limit(1)
          nextOrder = (maxOrderBlocks?.[0]?.orden || 0) + 1
        }

        const { data: newBlock, error: blockCreateError } = await supabase
          .from('routine_blocks')
          .insert({
            routine_day_id: dayId,
            nombre: blockName,
            orden: nextOrder,
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
        .select('orden')
        .eq('routine_block_id', blockId)
        .order('orden', { ascending: false })
        .limit(1)

      const nextExerciseOrder = (maxOrderExercises?.[0]?.orden || 0) + 1

      // Insertar el ejercicio en el bloque
      const { data: newExercise, error: exerciseError } = await supabase
        .from('routine_exercises')
        .insert({
          routine_block_id: blockId,
          exercise_id: exerciseId,
          series: series || 3,
          reps: reps || '8-12',
          orden: nextExerciseOrder,
          notas: notas || null,
          tempo: tempo || null,
          tempo_razon: tempo_razon || null,
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
