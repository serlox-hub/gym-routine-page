import { getClient } from './_client.js'
import { MeasurementType } from '../lib/measurementTypes.js'
import { t } from '../i18n/index.js'

export async function fetchExercisesWithMuscleGroup() {
  const { data, error } = await getClient()
    .from('exercises')
    .select(`
      id, name:name_es, name_en, measurement_type, weight_unit,
      is_system,
      muscle_group_id, muscle_group:muscle_groups!muscle_group_id(id, name:name_es, name_en),
      equipment_type:equipment_types!equipment_type_id(id, key, name:name_es, name_en)
    `)
    .is('deleted_at', null)
    .order('name_es')

  if (error) throw error
  return data
}

export async function fetchMuscleGroups() {
  const { data, error } = await getClient()
    .from('muscle_groups')
    .select('id, name:name_es, name_en, category')
    .order('name_es')

  if (error) throw error
  return data
}

export async function fetchExerciseStats() {
  const [sessionRes, routineRes] = await Promise.all([
    getClient().from('session_exercises').select('exercise_id'),
    getClient().from('routine_exercises').select('exercise_id, routine_block:routine_blocks(routine_day:routine_days(routine_id))'),
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
    getClient()
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
    getClient()
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
  const { data, error } = await getClient()
    .from('exercises')
    .select(`
      id, name:name_es, name_en, measurement_type, weight_unit,
      is_system, instructions, deleted_at,
      muscle_group_id, muscle_group:muscle_groups!muscle_group_id(id, name:name_es, name_en),
      equipment_type:equipment_types!equipment_type_id(id, key, name:name_es, name_en)
    `)
    .eq('id', exerciseId)
    .single()

  if (error) throw error
  return data
}

export async function createExercise({ userId, exercise, muscleGroupId }) {
  const { data, error } = await getClient()
    .from('exercises')
    .insert({
      name_es: exercise.name,
      instructions: exercise.instructions || null,
      measurement_type: exercise.measurement_type || MeasurementType.WEIGHT_REPS,
      weight_unit: exercise.weight_unit || null,
      muscle_group_id: muscleGroupId || null,
      user_id: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateExercise({ exerciseId, exercise, muscleGroupId }) {
  const { data, error } = await getClient()
    .from('exercises')
    .update({
      name_es: exercise.name,
      instructions: exercise.instructions || null,
      measurement_type: exercise.measurement_type || MeasurementType.WEIGHT_REPS,
      weight_unit: exercise.weight_unit || null,
      muscle_group_id: muscleGroupId || null,
    })
    .eq('id', exerciseId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchEquipmentTypes() {
  const { data, error } = await getClient()
    .from('equipment_types')
    .select('id, key, name:name_es, name_en')
    .order('name_es')
  if (error) throw error
  return data
}

export async function deleteExercise(exerciseId) {
  const { data: exercise, error: fetchError } = await getClient()
    .from('exercises')
    .select('is_system')
    .eq('id', exerciseId)
    .single()

  if (fetchError) throw fetchError
  if (exercise?.is_system) {
    throw new Error(t('exercise:cannotDeleteSystem'))
  }

  const { data: usedInRoutines, error: checkError } = await getClient()
    .from('routine_exercises')
    .select('id')
    .eq('exercise_id', exerciseId)
    .limit(1)

  if (checkError) throw checkError

  if (usedInRoutines && usedInRoutines.length > 0) {
    throw new Error(t('exercise:usedInRoutine'))
  }

  const { error } = await getClient()
    .from('exercises')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', exerciseId)

  if (error) throw error
  return exerciseId
}
