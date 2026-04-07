import { getClient } from './_client.js'
import { BLOCK_NAMES } from '../lib/constants.js'

// ============================================
// SESSION EXERCISES - QUERIES
// ============================================

export async function fetchSessionExercises(sessionId) {
  const { data, error } = await getClient()
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
      notes,
      superset_group,
      is_extra,
      block_name,
      exercise:exercises (
        id,
        name:name_es,
        name_en,
        instructions,
        measurement_type,
        weight_unit,
        muscle_group:muscle_groups!muscle_group_id (
          id,
          name:name_es,
          name_en
        )
      )
    `)
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function fetchSessionExercisesSortOrder(sessionId) {
  const { data, error } = await getClient()
    .from('session_exercises')
    .select('id, sort_order, superset_group')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function fetchSessionExerciseBlockName(sessionExerciseId) {
  const { data, error } = await getClient()
    .from('session_exercises')
    .select('block_name')
    .eq('id', sessionExerciseId)
    .single()

  if (error) throw error
  return data?.block_name || null
}

export async function updateSessionExerciseSortOrder(id, sortOrder) {
  const { error } = await getClient()
    .from('session_exercises')
    .update({ sort_order: sortOrder })
    .eq('id', id)

  if (error) throw error
}

export async function insertSessionExercise({ sessionId, exerciseId, sortOrder, series, reps, rir, restSeconds, notes, supersetGroup, blockName }) {
  const { data, error } = await getClient()
    .from('session_exercises')
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      routine_exercise_id: null,
      sort_order: sortOrder,
      series: series || 3,
      reps: reps || '10',
      rir,
      rest_seconds: restSeconds,
      notes,
      superset_group: supersetGroup,
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
      notes,
      superset_group,
      is_extra,
      block_name,
      exercise:exercises (
        id,
        name:name_es,
        name_en,
        measurement_type,
        weight_unit
      )
    `)
    .single()

  if (error) throw error
  return data
}

// ============================================
// SESSION EXERCISES - MUTATIONS
// ============================================

export async function deleteCompletedSetsByExercise({ sessionId, sessionExerciseId }) {
  const { error } = await getClient()
    .from('completed_sets')
    .delete()
    .eq('session_id', sessionId)
    .eq('session_exercise_id', sessionExerciseId)

  if (error) throw error
}

export async function updateSessionExerciseExerciseId({ sessionExerciseId, newExerciseId }) {
  const { data, error } = await getClient()
    .from('session_exercises')
    .update({ exercise_id: newExerciseId })
    .eq('id', sessionExerciseId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addSessionExercise({ sessionId, exercise, series, reps, rir, rest_seconds, notes, superset_group }) {
  const existing = await fetchSessionExercisesSortOrder(sessionId)

  let insertSortOrder
  let blockName = BLOCK_NAMES.MAIN

  if (superset_group && existing?.length) {
    const supersetExercises = existing.filter(e => e.superset_group === superset_group)

    if (supersetExercises.length > 0) {
      const lastSupersetExercise = supersetExercises[supersetExercises.length - 1]
      insertSortOrder = lastSupersetExercise.sort_order + 1

      const supersetMember = existing.find(e => e.superset_group === superset_group)
      if (supersetMember) {
        const memberBlockName = await fetchSessionExerciseBlockName(supersetMember.id)
        if (memberBlockName) {
          blockName = memberBlockName
        }
      }

      const exercisesToShift = existing.filter(e => e.sort_order >= insertSortOrder)
      if (exercisesToShift.length > 0) {
        await Promise.all(
          exercisesToShift.map(e => updateSessionExerciseSortOrder(e.id, e.sort_order + 1))
        )
      }
    } else {
      insertSortOrder = (existing[existing.length - 1]?.sort_order || 0) + 1
    }
  } else {
    insertSortOrder = (existing?.[existing.length - 1]?.sort_order || 0) + 1
  }

  return insertSessionExercise({
    sessionId,
    exerciseId: exercise.id,
    sortOrder: insertSortOrder,
    series: series || 3,
    reps: reps || '10',
    rir,
    restSeconds: rest_seconds,
    notes,
    supersetGroup: superset_group,
    blockName,
  })
}

export async function updateSessionExerciseFields(sessionExerciseId, fields) {
  const { error } = await getClient()
    .from('session_exercises')
    .update(fields)
    .eq('id', sessionExerciseId)

  if (error) throw error
}

export async function deleteSessionExercise(sessionExerciseId) {
  const { error } = await getClient()
    .from('session_exercises')
    .delete()
    .eq('id', sessionExerciseId)

  if (error) throw error
}

export async function reorderSessionExercises(orderedExerciseIds) {
  const exerciseOrders = orderedExerciseIds.map((id, index) => ({
    id,
    sort_order: index + 1
  }))

  const { error } = await getClient().rpc('reorder_session_exercises', {
    exercise_orders: exerciseOrders
  })

  if (error) throw error
}
