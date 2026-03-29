import { getClient } from './_client.js'
import { BLOCK_NAMES } from '../lib/constants.js'

// ============================================
// MUTATIONS
// ============================================

export async function createRoutine({ userId, routine }) {
  const { data, error } = await getClient()
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
}

export async function createRoutineDay({ routineId, day }) {
  const { data, error } = await getClient()
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
}

export async function updateRoutine({ routineId, data }) {
  const { data: updated, error } = await getClient()
    .from('routines')
    .update(data)
    .eq('id', routineId)
    .select()
    .single()

  if (error) throw error
  return updated
}

export async function deleteRoutine(routineId) {
  const { error } = await getClient()
    .from('routines')
    .delete()
    .eq('id', routineId)

  if (error) throw error
}

export async function deleteRoutines(routineIds) {
  const { error } = await getClient()
    .from('routines')
    .delete()
    .in('id', routineIds)

  if (error) throw error
}

export async function setFavoriteRoutine({ routineId, isFavorite }) {
  if (isFavorite) {
    const { error: clearError } = await getClient()
      .from('routines')
      .update({ is_favorite: false })
      .neq('id', routineId)

    if (clearError) throw clearError
  }

  const { error } = await getClient()
    .from('routines')
    .update({ is_favorite: isFavorite })
    .eq('id', routineId)

  if (error) throw error
}

export async function updateRoutineDay({ dayId, data }) {
  const { error } = await getClient()
    .from('routine_days')
    .update(data)
    .eq('id', dayId)

  if (error) throw error
}

export async function deleteRoutineDay(dayId) {
  const { error } = await getClient()
    .from('routine_days')
    .delete()
    .eq('id', dayId)

  if (error) throw error
}

export async function reorderRoutineDays(days) {
  const dayOrders = days.map((day, index) => ({
    id: day.id,
    sort_order: index + 1
  }))

  const { error } = await getClient().rpc('reorder_routine_days', {
    day_orders: dayOrders
  })

  if (error) throw error
}

export async function deleteRoutineExercise(exerciseId) {
  const { error } = await getClient()
    .from('routine_exercises')
    .delete()
    .eq('id', exerciseId)

  if (error) throw error
}

export async function updateRoutineExercise({ exerciseId, data }) {
  const { error } = await getClient()
    .from('routine_exercises')
    .update(data)
    .eq('id', exerciseId)

  if (error) throw error
}

export async function reorderRoutineExercises(exercises) {
  const exerciseOrders = exercises.map((exercise, index) => ({
    id: exercise.id,
    sort_order: index + 1
  }))

  const { error } = await getClient().rpc('reorder_routine_exercises', {
    exercise_orders: exerciseOrders
  })

  if (error) throw error
}

export async function addExerciseToDay({ dayId, exerciseId, series, reps, rir, rest_seconds, notes, tempo, tempo_razon, esCalentamiento = false, superset_group }) {
  const blockName = esCalentamiento ? BLOCK_NAMES.WARMUP : BLOCK_NAMES.MAIN

  // Buscar o crear el bloque correspondiente
  const { data: existingBlock, error: blockFetchError } = await getClient()
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
    let nextOrder = 1
    if (!esCalentamiento) {
      const { data: maxOrderBlocks } = await getClient()
        .from('routine_blocks')
        .select('sort_order')
        .eq('routine_day_id', dayId)
        .order('sort_order', { ascending: false })
        .limit(1)
      nextOrder = (maxOrderBlocks?.[0]?.sort_order || 0) + 1
    }

    const { data: newBlock, error: blockCreateError } = await getClient()
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

  // Obtener el maximo orden de ejercicios en el bloque
  const { data: maxOrderExercises } = await getClient()
    .from('routine_exercises')
    .select('sort_order')
    .eq('routine_block_id', blockId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextExerciseOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

  const { data: newExercise, error: exerciseError } = await getClient()
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
}

export async function duplicateRoutineExercise({ routineExercise }) {
  const blockId = routineExercise.routine_block_id

  const { data: maxOrderExercises } = await getClient()
    .from('routine_exercises')
    .select('sort_order')
    .eq('routine_block_id', blockId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

  const { data, error } = await getClient()
    .from('routine_exercises')
    .insert({
      routine_block_id: blockId,
      exercise_id: routineExercise.exercise_id,
      series: routineExercise.series,
      reps: routineExercise.reps,
      rir: routineExercise.rir,
      rest_seconds: routineExercise.rest_seconds,
      tempo: routineExercise.tempo,
      tempo_razon: routineExercise.tempo_razon,
      notes: routineExercise.notes,
      superset_group: null,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function moveRoutineExerciseToDay({ routineExercise, targetDayId, esCalentamiento = false }) {
  const blockName = esCalentamiento ? BLOCK_NAMES.WARMUP : BLOCK_NAMES.MAIN

  const { data: existingBlock, error: blockFetchError } = await getClient()
    .from('routine_blocks')
    .select('id')
    .eq('routine_day_id', targetDayId)
    .eq('name', blockName)
    .single()

  if (blockFetchError && blockFetchError.code !== 'PGRST116') {
    throw blockFetchError
  }

  let targetBlockId
  if (!existingBlock) {
    const { data: maxOrderBlocks } = await getClient()
      .from('routine_blocks')
      .select('sort_order')
      .eq('routine_day_id', targetDayId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextBlockOrder = (maxOrderBlocks?.[0]?.sort_order || 0) + 1

    const { data: newBlock, error: blockCreateError } = await getClient()
      .from('routine_blocks')
      .insert({
        routine_day_id: targetDayId,
        name: blockName,
        sort_order: nextBlockOrder,
      })
      .select()
      .single()

    if (blockCreateError) throw blockCreateError
    targetBlockId = newBlock.id
  } else {
    targetBlockId = existingBlock.id
  }

  const { data: maxOrderExercises } = await getClient()
    .from('routine_exercises')
    .select('sort_order')
    .eq('routine_block_id', targetBlockId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

  const { data, error } = await getClient()
    .from('routine_exercises')
    .update({
      routine_block_id: targetBlockId,
      sort_order: nextOrder,
      superset_group: null,
    })
    .eq('id', routineExercise.id)
    .select()
    .single()

  if (error) throw error
  return data
}
