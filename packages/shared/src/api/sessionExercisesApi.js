import { getClient } from './_client.js'

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
      target_field,
      reps,
      level,
      rir,
      rest_seconds,
      notes,
      superset_group,
      is_extra,
      is_warmup,
      exercise:exercises (
        id,
        name:name_es,
        name_en,
        instructions,
        gif_key,
        tracked_fields,
        distance_unit,
        is_system,
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

// ============================================
// SESSION EXERCISES - MUTATIONS
// ============================================

/**
 * Sustituye el ejercicio de una fila de sesión en una sola transacción: borra sus series, cambia el
 * ejercicio (también en su fila de rutina si `applyToRoutine`) y aplica el parche `fields`
 * (`buildReplaceSessionExerciseFields`). Ver migración 064.
 */
export async function replaceSessionExercise({ sessionExerciseId, newExerciseId, fields, applyToRoutine }) {
  const { error } = await getClient().rpc('replace_session_exercise', {
    p_session_exercise_id: sessionExerciseId,
    p_new_exercise_id: newExerciseId,
    p_fields: fields,
    p_apply_to_routine: applyToRoutine,
  })

  if (error) throw error
}

/**
 * Corrects the exercise of a row of a completed session, keeping its sets (weights times
 * `weightFactor`), in one transaction. Never touches the routine. See migration 069.
 */
export async function correctSessionExercise({ sessionExerciseId, newExerciseId, weightFactor }) {
  const { error } = await getClient().rpc('correct_session_exercise', {
    p_session_exercise_id: sessionExerciseId,
    p_new_exercise_id: newExerciseId,
    p_weight_factor: weightFactor,
  })

  if (error) throw error
}

/**
 * Adds an exercise to the session and, with `addToRoutine`, also to the session's routine day, in
 * one transaction (migration 065). `fields` are column values (`pickSessionExerciseFields`).
 * `routine_exercise_id` comes back null when the exercise went to the session only, which also
 * happens with `addToRoutine` if the day was deleted mid-session.
 * @returns {Promise<{ session_exercise_id: number, routine_exercise_id: number|null }>}
 */
export async function addSessionExercise({ sessionId, exerciseId, fields, supersetGroup, addToRoutine }) {
  const { data, error } = await getClient().rpc('add_session_exercise', {
    p_session_id: sessionId,
    p_exercise_id: exerciseId,
    p_fields: fields,
    p_superset_group: supersetGroup ?? null,
    p_add_to_routine: addToRoutine === true,
  })

  if (error) throw error
  return data
}

export async function updateSessionExerciseFields(sessionExerciseId, fields, { propagateToRoutine = false } = {}) {
  const client = getClient()

  if (propagateToRoutine) {
    // Sesión y rutina en una sola transacción: dos UPDATE sueltos dejaban la sesión editada y
    // la rutina no si fallaba el segundo. Ver migración 063.
    const { error } = await client.rpc('update_session_exercise_with_routine', {
      p_session_exercise_id: sessionExerciseId,
      p_fields: fields,
    })
    if (error) throw error
    return
  }

  const { error } = await client
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

/**
 * Reorders the whole session (warm-up first) in one atomic write, plus the membership of the items
 * that carry `supersetGroup` (null = leave the superset). Items without the key keep their group.
 *
 * @param {Array<{ id: number, supersetGroup?: number|null }>} items - The session in its new order
 */
export async function reorderSessionExercises(items) {
  const exerciseOrders = items.map((item, index) => ({
    id: item.id,
    sort_order: index + 1,
    ...('supersetGroup' in item ? { superset_group: item.supersetGroup } : null),
  }))

  const { error } = await getClient().rpc('reorder_session_exercises', {
    exercise_orders: exerciseOrders
  })

  if (error) throw error
}
