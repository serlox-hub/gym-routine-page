import { getClient } from './_client.js'

// ============================================
// SESSION - RESTORE
// ============================================

export async function fetchActiveSession() {
  const { data, error } = await getClient()
    .from('workout_sessions')
    .select('id, routine_day_id, started_at, routine_days(routine_id)')
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function fetchCompletedSetsForSession(sessionId) {
  const { data, error } = await getClient()
    .from('completed_sets')
    .select('session_exercise_id, set_number, weight, weight_unit, reps_completed, time_seconds, distance_meters, pace_seconds, rir_actual, notes, video_url')
    .eq('session_id', sessionId)

  if (error) throw error
  return data || []
}

// ============================================
// SESSION - MUTATIONS
// ============================================

export async function startWorkoutSession({ routineDayId, routineName, dayName, exercises }) {
  const { data, error } = await getClient().rpc('start_workout_session', {
    p_routine_day_id: routineDayId,
    p_routine_name: routineName,
    p_day_name: dayName,
    p_exercises: exercises,
  })

  if (error) throw error
  return data
}

export async function fetchExerciseIdsWithSets(sessionId) {
  const { data, error } = await getClient()
    .from('completed_sets')
    .select('session_exercise_id')
    .eq('session_id', sessionId)

  if (error) throw error
  return (data || []).map(s => s.session_exercise_id)
}

export async function deleteSessionExercisesWithoutSets(sessionId, exerciseIdsWithSets) {
  const { error } = await getClient()
    .from('session_exercises')
    .delete()
    .eq('session_id', sessionId)
    .not('id', 'in', `(${exerciseIdsWithSets.join(',')})`)

  if (error) throw error
}

export async function completeWorkoutSession({ sessionId, completedAt, durationMinutes, overallFeeling, notes }) {
  const { data, error } = await getClient()
    .from('workout_sessions')
    .update({
      completed_at: completedAt,
      duration_minutes: durationMinutes,
      status: 'completed',
      overall_feeling: overallFeeling,
      notes,
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWorkoutSession(sessionId) {
  const { error } = await getClient()
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}

// ============================================
// COMPLETED SETS
// ============================================

export async function upsertCompletedSet({ sessionId, sessionExerciseId, setNumber, weight, weightUnit, repsCompleted, timeSeconds, distanceMeters, paceSeconds, rirActual, notes, videoUrl }) {
  const { data, error } = await getClient()
    .from('completed_sets')
    .upsert({
      session_id: sessionId,
      session_exercise_id: sessionExerciseId,
      set_number: setNumber,
      weight,
      weight_unit: weightUnit,
      reps_completed: repsCompleted,
      time_seconds: timeSeconds,
      distance_meters: distanceMeters,
      pace_seconds: paceSeconds,
      rir_actual: rirActual,
      notes,
      video_url: videoUrl,
      completed: true,
    }, {
      onConflict: 'session_id,session_exercise_id,set_number',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSetVideo({ sessionId, sessionExerciseId, setNumber, videoUrl }) {
  const { data, error } = await getClient()
    .from('completed_sets')
    .update({ video_url: videoUrl })
    .eq('session_id', sessionId)
    .eq('session_exercise_id', sessionExerciseId)
    .eq('set_number', setNumber)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSetDetails({ sessionId, sessionExerciseId, setNumber, rirActual, notes, videoUrl }) {
  const updateData = {
    rir_actual: rirActual,
    notes,
  }
  if (videoUrl !== undefined) {
    updateData.video_url = videoUrl
  }

  const { error } = await getClient()
    .from('completed_sets')
    .update(updateData)
    .eq('session_id', sessionId)
    .eq('session_exercise_id', sessionExerciseId)
    .eq('set_number', setNumber)

  if (error) throw error
}

export async function deleteCompletedSet({ sessionId, sessionExerciseId, setNumber }) {
  const { error } = await getClient()
    .from('completed_sets')
    .delete()
    .eq('session_id', sessionId)
    .eq('session_exercise_id', sessionExerciseId)
    .eq('set_number', setNumber)

  if (error) throw error
}

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

export async function insertSessionExercise({ sessionId, exerciseId, sortOrder, series, reps, rir, restSeconds, tempo, notes, supersetGroup, blockName }) {
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
      tempo,
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

export async function addSessionExercise({ sessionId, exercise, series, reps, rir, rest_seconds, notes, tempo, superset_group }) {
  const existing = await fetchSessionExercisesSortOrder(sessionId)

  let insertSortOrder
  let blockName = 'Principal'

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
    tempo,
    notes,
    supersetGroup: superset_group,
    blockName,
  })
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

// ============================================
// WORKOUT HISTORY
// ============================================

export async function fetchWorkoutHistory({ from, to }) {
  const { data, error } = await getClient()
    .from('workout_sessions')
    .select(`
      id,
      started_at,
      completed_at,
      duration_minutes,
      status,
      overall_feeling,
      notes,
      routine_name,
      day_name,
      routine_day:routine_days (
        id,
        name,
        routine:routines (
          id,
          name
        )
      ),
      session_exercises (
        id,
        exercise:exercises (
          id,
          muscle_group:muscle_groups (
            id,
            name
          )
        )
      )
    `)
    .eq('status', 'completed')
    .gte('started_at', from)
    .lte('started_at', to)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchSessionDetail(sessionId) {
  const { data, error } = await getClient()
    .from('workout_sessions')
    .select(`
      id,
      started_at,
      completed_at,
      duration_minutes,
      status,
      overall_feeling,
      notes,
      routine_name,
      day_name,
      routine_day:routine_days (
        id,
        name,
        routine:routines (
          id,
          name
        )
      ),
      session_exercises (
        id,
        sort_order,
        series,
        reps,
        is_extra,
        block_name,
        exercise:exercises (
          id,
          name,
          deleted_at,
          time_unit,
          distance_unit,
          muscle_group:muscle_groups (
            id,
            name
          )
        ),
        completed_sets (
          id,
          set_number,
          weight,
          weight_unit,
          reps_completed,
          time_seconds,
          distance_meters,
          pace_seconds,
          rir_actual,
          notes,
          video_url,
          performed_at
        )
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data
}

export async function fetchExerciseHistorySummary({ exerciseId, routineDayId }) {
  let query = getClient()
    .from('session_exercises')
    .select(`
      id,
      session:workout_sessions!inner (
        id,
        started_at,
        status,
        routine_day_id
      ),
      completed_sets!inner (
        weight,
        reps_completed,
        time_seconds,
        distance_meters,
        pace_seconds,
        set_number
      )
    `)
    .eq('exercise_id', exerciseId)
    .eq('session.status', 'completed')
    .order('session(started_at)', { ascending: false })

  if (routineDayId) {
    query = query.eq('session.routine_day_id', routineDayId)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function fetchExerciseHistory({ exerciseId, routineDayId, from, to }) {
  let query = getClient()
    .from('session_exercises')
    .select(`
      id,
      session:workout_sessions!inner (
        id,
        started_at,
        status,
        routine_day_id
      ),
      completed_sets!inner (
        id,
        set_number,
        weight,
        weight_unit,
        reps_completed,
        time_seconds,
        distance_meters,
        pace_seconds,
        rir_actual,
        notes,
        performed_at
      )
    `)
    .eq('exercise_id', exerciseId)
    .eq('session.status', 'completed')
    .order('session(started_at)', { ascending: false })
    .range(from, to)

  if (routineDayId) {
    query = query.eq('session.routine_day_id', routineDayId)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function fetchPreviousWorkout(exerciseId) {
  const { data, error } = await getClient()
    .from('session_exercises')
    .select(`
      id,
      session:workout_sessions!inner (
        id,
        started_at,
        status
      ),
      completed_sets!inner (
        set_number,
        weight,
        weight_unit,
        reps_completed,
        time_seconds,
        distance_meters,
        pace_seconds,
        rir_actual,
        notes,
        performed_at
      )
    `)
    .eq('exercise_id', exerciseId)
    .eq('session.status', 'completed')
    .order('session(started_at)', { ascending: false })
    .limit(1)

  if (error) throw error
  return data
}
