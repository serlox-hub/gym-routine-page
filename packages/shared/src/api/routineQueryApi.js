import { getClient } from './_client.js'
import { BLOCK_NAMES } from '../lib/constants.js'

// ============================================
// QUERIES
// ============================================

export async function fetchRoutines() {
  const { data, error } = await getClient()
    .from('routines')
    .select('*, routine_days(id, routine_exercises(id))')
    .order('id')

  if (error) throw error

  return (data || []).map(r => {
    const days = r.routine_days || []
    const exerciseCount = days.reduce((sum, d) => sum + (d.routine_exercises?.length || 0), 0)
    const { routine_days: _, ...routine } = r
    return { ...routine, days_count: days.length, exercises_count: exerciseCount }
  })
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
    // `*` en routine_exercises es deliberado (issue #22, cerrado): lo único que sobra es
    // `user_id`, que RLS ya acota al propio usuario, y enumerar dejaría un fallo silencioso
    // permanente — una columna nueva que nadie añada aquí llega `undefined`, sin error. La fila
    // se consume entera y lejos (`duplicateRoutineExercise` lee hasta `routine_day_id`), y su
    // shape ya tiene cuatro copias manuales (ver docs/routine-io.md). El select ANIDADO de
    // `exercises` sí es lista fija (7 de 12 columnas) y por tanto SÍ tiene ese riesgo: una columna
    // nueva del catálogo hay que añadirla aquí Y en las demás proyecciones (paso 8 del checklist
    // de docs/routine-io.md). Se enumera porque necesita alias (`name:name_es`), no por tamaño.
    .select(`
      *,
      exercise:exercises (
        id,
        name:name_es,
        name_en,
        tracked_fields,
        is_system,
        instructions,
        gif_key,
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
