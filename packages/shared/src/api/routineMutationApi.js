import { getClient } from './_client.js'

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

export async function addExerciseToDay({ dayId, exerciseId, series, reps, rir, rest_seconds, notes, esCalentamiento = false, superset_group }) {
  // Obtener el maximo orden de ejercicios en el día
  const { data: maxOrderExercises } = await getClient()
    .from('routine_exercises')
    .select('sort_order')
    .eq('routine_day_id', dayId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextExerciseOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

  const { data: newExercise, error: exerciseError } = await getClient()
    .from('routine_exercises')
    .insert({
      routine_day_id: dayId,
      is_warmup: esCalentamiento,
      exercise_id: exerciseId,
      series: series || 3,
      reps: reps || '8-12',
      rir: rir ?? null,
      rest_seconds: rest_seconds || null,
      sort_order: nextExerciseOrder,
      notes: notes || null,
      superset_group: superset_group ?? null,
    })
    .select()
    .single()

  if (exerciseError) throw exerciseError
  return newExercise
}

export async function duplicateRoutineExercise({ routineExercise }) {
  const dayId = routineExercise.routine_day_id

  const { data: maxOrderExercises } = await getClient()
    .from('routine_exercises')
    .select('sort_order')
    .eq('routine_day_id', dayId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

  const { data, error } = await getClient()
    .from('routine_exercises')
    .insert({
      routine_day_id: dayId,
      is_warmup: routineExercise.is_warmup || false,
      exercise_id: routineExercise.exercise_id,
      series: routineExercise.series,
      reps: routineExercise.reps,
      rir: routineExercise.rir,
      rest_seconds: routineExercise.rest_seconds,
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
  const { data: maxOrderExercises } = await getClient()
    .from('routine_exercises')
    .select('sort_order')
    .eq('routine_day_id', targetDayId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

  const { data, error } = await getClient()
    .from('routine_exercises')
    .update({
      routine_day_id: targetDayId,
      is_warmup: esCalentamiento,
      sort_order: nextOrder,
      superset_group: null,
    })
    .eq('id', routineExercise.id)
    .select()
    .single()

  if (error) throw error
  return data
}
