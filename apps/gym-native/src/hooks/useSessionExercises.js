import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '@gym/shared'
import useWorkoutStore from '../stores/workoutStore.js'

// ============================================
// SESSION EXERCISES QUERIES & MUTATIONS
// ============================================

export function useSessionExercises(sessionId) {
  return useQuery({
    queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_exercises')
        .select(`
          id,
          exercise_id,
          routine_exercise_id,
          sort_order,
          series,
          reps,
          rir,
          rest_seconds,
          tempo,
          notes,
          superset_group,
          is_extra,
          block_name,
          exercise:exercises (
            id,
            name,
            instructions,
            measurement_type,
            weight_unit,
            time_unit,
            distance_unit,
            muscle_group:muscle_groups (
              id,
              name
            )
          ),
          routine_exercise:routine_exercises (
            tempo_razon
          )
        `)
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!sessionId,
  })
}

export function useAddSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  return useMutation({
    mutationFn: async ({ exercise, series, reps, rir, rest_seconds, notes, tempo, superset_group }) => {
      // Obtener todos los ejercicios de la sesión para calcular posición
      const { data: existing } = await supabase
        .from('session_exercises')
        .select('id, sort_order, superset_group')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true })

      let insertSortOrder
      let blockName = 'Principal'

      if (superset_group && existing?.length) {
        // Si se asigna a un superset, insertar después del último ejercicio del superset
        const supersetExercises = existing.filter(e => e.superset_group === superset_group)

        if (supersetExercises.length > 0) {
          // Encontrar la posición del último ejercicio del superset
          const lastSupersetExercise = supersetExercises[supersetExercises.length - 1]
          insertSortOrder = lastSupersetExercise.sort_order + 1

          // Usar el mismo bloque que el superset (buscar en existing)
          const supersetMember = existing.find(e => e.superset_group === superset_group)
          if (supersetMember) {
            // Necesitamos obtener el block_name del superset
            const { data: memberData } = await supabase
              .from('session_exercises')
              .select('block_name')
              .eq('id', supersetMember.id)
              .single()
            if (memberData?.block_name) {
              blockName = memberData.block_name
            }
          }

          // Desplazar los ejercicios posteriores
          const exercisesToShift = existing.filter(e => e.sort_order >= insertSortOrder)
          if (exercisesToShift.length > 0) {
            const updates = exercisesToShift.map(e =>
              supabase
                .from('session_exercises')
                .update({ sort_order: e.sort_order + 1 })
                .eq('id', e.id)
            )
            await Promise.all(updates)
          }
        } else {
          // Superset nuevo, añadir al final
          insertSortOrder = (existing[existing.length - 1]?.sort_order || 0) + 1
        }
      } else {
        // Sin superset, añadir al final
        insertSortOrder = (existing?.[existing.length - 1]?.sort_order || 0) + 1
      }

      const { data, error } = await supabase
        .from('session_exercises')
        .insert({
          session_id: sessionId,
          exercise_id: exercise.id,
          routine_exercise_id: null,
          sort_order: insertSortOrder,
          series: series || 3,
          reps: reps || '10',
          rir,
          rest_seconds,
          tempo,
          notes,
          superset_group,
          is_extra: true,
          block_name: blockName,
        })
        .select(`
          id,
          exercise_id,
          sort_order,
          series,
          reps,
          rir,
          rest_seconds,
          tempo,
          notes,
          superset_group,
          is_extra,
          block_name,
          exercise:exercises (
            id,
            name,
            measurement_type,
            weight_unit,
            time_unit,
            distance_unit
          )
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
    },
  })
}

export function useReplaceSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const clearExercise = useWorkoutStore(state => state.clearExercise)

  return useMutation({
    mutationFn: async ({ sessionExerciseId, newExerciseId }) => {
      // Eliminar series completadas del ejercicio anterior
      await supabase
        .from('completed_sets')
        .delete()
        .eq('session_id', sessionId)
        .eq('session_exercise_id', sessionExerciseId)

      // Actualizar el exercise_id
      const { data, error } = await supabase
        .from('session_exercises')
        .update({ exercise_id: newExerciseId })
        .eq('id', sessionExerciseId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { sessionExerciseId }) => {
      clearExercise(sessionExerciseId)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}

export function useRemoveSessionExercise() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  const clearExerciseFromStore = useWorkoutStore(state => state.clearExercise)

  return useMutation({
    mutationFn: async (sessionExerciseId) => {
      const { error } = await supabase
        .from('session_exercises')
        .delete()
        .eq('id', sessionExerciseId)

      if (error) throw error
    },
    onSuccess: (_, sessionExerciseId) => {
      clearExerciseFromStore(sessionExerciseId)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    },
  })
}

export function useReorderSessionExercises() {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)

  return useMutation({
    mutationFn: async (orderedExerciseIds) => {
      const exerciseOrders = orderedExerciseIds.map((id, index) => ({
        id,
        sort_order: index + 1
      }))

      const { error } = await supabase.rpc('reorder_session_exercises', {
        exercise_orders: exerciseOrders
      })

      if (error) throw error
    },
    onMutate: async (orderedExerciseIds) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
      const previous = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId])
      queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId], (old) => {
        if (!old) return old
        const orderMap = Object.fromEntries(orderedExerciseIds.map((id, i) => [id, i + 1]))
        return [...old]
          .map(item => ({ ...item, sort_order: orderMap[item.id] ?? item.sort_order }))
          .sort((a, b) => a.sort_order - b.sort_order)
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, sessionId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
    },
  })
}
