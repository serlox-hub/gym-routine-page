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

export async function fetchRoutineBlocks(dayId) {
  const { data, error } = await getClient()
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
          instructions,
          muscle_group:muscle_groups (
            id,
            name
          )
        )
      )
    `)
    .eq('routine_day_id', dayId)
    .order('sort_order')

  if (error) throw error

  // Ordenar bloques: Calentamiento siempre primero, luego por sort_order
  const sortedBlocks = data.sort((a, b) => {
    if (a.name === BLOCK_NAMES.WARMUP) return -1
    if (b.name === BLOCK_NAMES.WARMUP) return 1
    return a.sort_order - b.sort_order
  })

  return sortedBlocks.map(block => ({
    ...block,
    routine_exercises: block.routine_exercises.sort((a, b) => a.sort_order - b.sort_order)
  }))
}

export async function fetchRoutineAllExercises(routineId) {
  const { data, error } = await getClient()
    .from('routine_exercises')
    .select(`
      *,
      routine_block:routine_blocks!inner (
        routine_day:routine_days!inner (
          routine_id
        )
      )
    `)
    .eq('routine_block.routine_day.routine_id', routineId)

  if (error) throw error
  return data
}
