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
    .select('session_exercise_id, set_number, weight, reps_completed, time_seconds, distance_meters, pace_seconds, rir_actual, notes, video_url, set_type')
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

export async function updateSessionMetadata({ sessionId, completedAt, durationMinutes, overallFeeling, notes }) {
  const { data, error } = await getClient()
    .from('workout_sessions')
    .update({
      completed_at: completedAt,
      duration_minutes: durationMinutes,
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
// SESSION COUNT
// ============================================

export async function fetchCompletedSessionCount() {
  const { count, error } = await getClient()
    .from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  if (error) throw error
  return count || 0
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
          muscle_group:muscle_groups!muscle_group_id (
            id,
            name:name_es,
            name_en
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
        is_warmup,
        exercise:exercises (
          id,
          name:name_es,
          name_en,
          deleted_at,
          muscle_group:muscle_groups!muscle_group_id (
            id,
            name:name_es,
            name_en
          )
        ),
        completed_sets (
          id,
          set_number,
          weight,
          reps_completed,
          time_seconds,
          distance_meters,
          pace_seconds,
          rir_actual,
          notes,
          video_url,
          set_type,
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
        set_number,
        set_type
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
        reps_completed,
        time_seconds,
        distance_meters,
        pace_seconds,
        rir_actual,
        notes,
        video_url,
        set_type,
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
        reps_completed,
        time_seconds,
        distance_meters,
        pace_seconds,
        rir_actual,
        notes,
        set_type,
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
