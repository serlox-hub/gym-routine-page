import { supabase } from '../supabase.js'
import { MeasurementType } from '@gym/shared'

export async function fetchExercisesWithMuscleGroup() {
  const { data, error } = await supabase
    .from('exercises')
    .select(`
      id, name, measurement_type, weight_unit, time_unit, distance_unit,
      muscle_group_id, muscle_group:muscle_groups(id, name)
    `)
    .is('deleted_at', null)
    .order('name')

  if (error) throw error
  return data
}

export async function fetchMuscleGroups() {
  const { data, error } = await supabase
    .from('muscle_groups')
    .select('id, name')
    .order('name')

  if (error) throw error
  return data
}

export async function fetchExerciseStats() {
  const [sessionRes, routineRes] = await Promise.all([
    supabase.from('session_exercises').select('exercise_id'),
    supabase.from('routine_exercises').select('exercise_id, routine_block:routine_blocks(routine_day:routine_days(routine_id))'),
  ])

  if (sessionRes.error) throw sessionRes.error
  if (routineRes.error) throw routineRes.error

  const sessionCounts = {}
  for (const row of sessionRes.data) {
    sessionCounts[row.exercise_id] = (sessionCounts[row.exercise_id] || 0) + 1
  }

  const routineCounts = {}
  const routineSeen = {}
  for (const row of routineRes.data) {
    const routineId = row.routine_block?.routine_day?.routine_id
    const key = `${row.exercise_id}-${routineId}`
    if (!routineSeen[key]) {
      routineSeen[key] = true
      routineCounts[row.exercise_id] = (routineCounts[row.exercise_id] || 0) + 1
    }
  }

  return { sessionCounts, routineCounts }
}

export async function fetchExerciseUsageDetail(exerciseId) {
  const [routineRes, sessionRes] = await Promise.all([
    supabase
      .from('routine_exercises')
      .select(`
        id,
        routine_block:routine_blocks(
          routine_day:routine_days(
            name,
            routine:routines(id, name)
          )
        )
      `)
      .eq('exercise_id', exerciseId),
    supabase
      .from('session_exercises')
      .select(`
        id,
        workout_session:workout_sessions!inner(id, started_at, routine_name)
      `)
      .eq('exercise_id', exerciseId)
      .eq('workout_session.status', 'completed')
      .order('id', { ascending: false }),
  ])

  if (routineRes.error) throw routineRes.error
  if (sessionRes.error) throw sessionRes.error

  const routines = routineRes.data
    .map(re => {
      const day = re.routine_block?.routine_day
      const routine = day?.routine
      if (!routine) return null
      return { routineId: routine.id, routineName: routine.name, dayName: day.name }
    })
    .filter(Boolean)

  const seen = new Set()
  const uniqueRoutines = routines.filter(r => {
    const key = `${r.routineId}-${r.dayName}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const sessions = sessionRes.data
    .filter(se => se.workout_session)
    .map(se => ({
      sessionId: se.workout_session.id,
      date: se.workout_session.started_at,
      routineName: se.workout_session.routine_name,
    }))

  const seenSessions = new Set()
  const uniqueSessions = sessions.filter(s => {
    if (seenSessions.has(s.sessionId)) return false
    seenSessions.add(s.sessionId)
    return true
  })

  return { routines: uniqueRoutines, sessions: uniqueSessions }
}

export async function fetchExercise(exerciseId) {
  const { data, error } = await supabase
    .from('exercises')
    .select(`
      id, name, measurement_type, weight_unit, time_unit, distance_unit,
      instructions, deleted_at, muscle_group_id, muscle_group:muscle_groups(id, name)
    `)
    .eq('id', exerciseId)
    .single()

  if (error) throw error
  return data
}

export async function createExercise({ userId, exercise, muscleGroupId }) {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: exercise.name,
      instructions: exercise.instructions || null,
      measurement_type: exercise.measurement_type || MeasurementType.WEIGHT_REPS,
      weight_unit: exercise.weight_unit || 'kg',
      time_unit: exercise.time_unit || 's',
      distance_unit: exercise.distance_unit || 'm',
      muscle_group_id: muscleGroupId || null,
      user_id: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateExercise({ exerciseId, exercise, muscleGroupId }) {
  const { data, error } = await supabase
    .from('exercises')
    .update({
      name: exercise.name,
      instructions: exercise.instructions || null,
      measurement_type: exercise.measurement_type || MeasurementType.WEIGHT_REPS,
      weight_unit: exercise.weight_unit || 'kg',
      time_unit: exercise.time_unit || 's',
      distance_unit: exercise.distance_unit || 'm',
      muscle_group_id: muscleGroupId || null,
    })
    .eq('id', exerciseId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteExercise(exerciseId) {
  const { data: usedInRoutines, error: checkError } = await supabase
    .from('routine_exercises')
    .select('id')
    .eq('exercise_id', exerciseId)
    .limit(1)

  if (checkError) throw checkError

  if (usedInRoutines && usedInRoutines.length > 0) {
    throw new Error('Este ejercicio está siendo usado en una rutina. Elimínalo de la rutina primero.')
  }

  const { error } = await supabase
    .from('exercises')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', exerciseId)

  if (error) throw error
  return exerciseId
}
