import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'

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
        .order('dia_numero')
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
    queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, dayId],
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
              equipment:equipment(nombre),
              grip_type:grip_types(nombre),
              grip_width:grip_widths(nombre),
              altura_polea
            )
          )
        `)
        .eq('routine_day_id', dayId)
        .order('orden')
      if (error) throw error

      return data.map(block => ({
        ...block,
        routine_exercises: block.routine_exercises.sort((a, b) => a.orden - b.orden)
      }))
    },
    enabled: !!dayId
  })
}
