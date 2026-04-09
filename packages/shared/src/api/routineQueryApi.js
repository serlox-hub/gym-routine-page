import { getClient } from './_client.js'
import { BLOCK_NAMES } from '../lib/constants.js'

// ============================================
// QUERIES
// ============================================

export async function fetchRoutines() {
  const { data, error } = await getClient()
    .from('routines')
    .select('*')
    .order('id')

  if (error) throw error
  return data
}

export async function fetchRoutine(routineId) {
  const { data, error } = await getClient()
    .from('routines')
    .select('*')
    .eq('id', routineId)
    .single()

  if (error) throw error
  return data
}

export async function fetchRoutineDays(routineId) {
  const { data, error } = await getClient()
    .from('routine_days')
    .select('*')
    .eq('routine_id', routineId)
    .order('sort_order')

  if (error) throw error
  return data
}

export async function fetchRoutineDay(dayId) {
  const { data, error } = await getClient()
    .from('routine_days')
    .select(`
      *,
      routine:routines(name)
    `)
    .eq('id', dayId)
    .single()

  if (error) throw error
  return data
}

export async function fetchRoutineDayExercises(dayId) {
  const { data, error } = await getClient()
    .from('routine_exercises')
    .select(`
      *,
      exercise:exercises (
        id,
        name:name_es,
        name_en,
        measurement_type,
        is_system,
        instructions,
        muscle_group:muscle_groups!muscle_group_id (
          id,
          name:name_es,
          name_en
        )
      )
    `)
    .eq('routine_day_id', dayId)
    .order('sort_order')

  if (error) throw error

  // Group into virtual blocks for backward compatibility
  const warmup = (data || []).filter(re => re.is_warmup)
  const main = (data || []).filter(re => !re.is_warmup)

  return [
    warmup.length > 0 && { name: BLOCK_NAMES.WARMUP, is_warmup: true, routine_exercises: warmup, sort_order: 0 },
    main.length > 0 && { name: BLOCK_NAMES.MAIN, is_warmup: false, routine_exercises: main, sort_order: 1 },
  ].filter(Boolean)
}

export { fetchRoutineDayExercises as fetchRoutineBlocks }

export async function fetchRoutineAllExercises(routineId) {
  const { data, error } = await getClient()
    .from('routine_exercises')
    .select(`
      *,
      routine_day:routine_days!inner (
        routine_id
      )
    `)
    .eq('routine_day.routine_id', routineId)

  if (error) throw error
  return data
}
