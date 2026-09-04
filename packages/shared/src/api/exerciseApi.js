import { getClient, getGifBaseUrl } from './_client.js'
import { normalizeTrackedFields } from '../lib/measurementFields.js'
import { GIF_BUCKET, getExerciseGifPath, buildExerciseGifUrl } from '../lib/exerciseMedia.js'
import { t } from '../i18n/index.js'

/**
 * URL pública del GIF de un ejercicio, o null si no tiene animación.
 * Resuelve la base del Storage a través del cliente Supabase inyectado, salvo que
 * `initApi` haya recibido un `gifBaseUrl` (desarrollo local: el bucket está vacío).
 * @param {string|number|null} gifKey - `exercises.gif_key`
 * @param {'xs'|'sm'|'lg'} [size='sm'] - xs=180 (listas), sm=360 (sesión), lg=720 (pantalla completa)
 * @returns {string|null}
 */
export function getExerciseGifUrl(gifKey, size = 'sm') {
  const base = getGifBaseUrl()
  if (base) return buildExerciseGifUrl(base, gifKey, size)
  const path = getExerciseGifPath(gifKey, size)
  if (!path) return null
  const { data } = getClient().storage.from(GIF_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

export async function fetchExercisesWithMuscleGroup() {
  const { data, error } = await getClient()
    .from('exercises')
    .select(`
      id, name:name_es, name_en, tracked_fields,
      is_system, gif_key,
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

export async function fetchExercise(exerciseId) {
  const { data, error } = await getClient()
    .from('exercises')
    .select(`
      id, name:name_es, name_en, tracked_fields,
      is_system, instructions, deleted_at, gif_key,
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
      tracked_fields: normalizeTrackedFields(exercise.tracked_fields),
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
      tracked_fields: normalizeTrackedFields(exercise.tracked_fields),
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

// ============================================
// USER EXERCISE OVERRIDES
// ============================================

// Unidad de peso por (ejercicio, gym). Devuelve { [exercise_id]: 'kg'|'lb' } para el gym dado.
// Sin gymId no hay unidad resoluble (la unidad vive por gimnasio) → mapa vacío.
export async function fetchUserExerciseWeightUnits(exerciseIds, gymId) {
  if (!exerciseIds?.length || gymId == null) return {}
  const { data, error } = await getClient()
    .from('user_exercise_gym_units')
    .select('exercise_id, weight_unit')
    .eq('gym_id', gymId)
    .in('exercise_id', exerciseIds)

  if (error) throw error
  const map = {}
  for (const row of data || []) {
    map[row.exercise_id] = row.weight_unit
  }
  return map
}

// Todas las unidades explícitas por (ejercicio, gym) del usuario. Tabla pequeña (una fila
// por override); se prefetchea para resolver unidades en local al cambiar de gym a mitad de
// sesión, sin depender de la red (RLS acota al usuario).
export async function fetchAllUserExerciseGymUnits() {
  const { data, error } = await getClient()
    .from('user_exercise_gym_units')
    .select('exercise_id, gym_id, weight_unit')

  if (error) throw error
  return data || []
}

// Mapa gym_id -> unidad explícita de un ejercicio en todos los gyms (para el overlay).
export async function fetchExerciseUnitsByGym(exerciseId) {
  if (exerciseId == null) return {}
  const { data, error } = await getClient()
    .from('user_exercise_gym_units')
    .select('gym_id, weight_unit')
    .eq('exercise_id', exerciseId)

  if (error) throw error
  const map = {}
  for (const row of data || []) {
    map[row.gym_id] = row.weight_unit
  }
  return map
}

// Unidad explícita de un (ejercicio, gym), o null si hereda la global.
export async function fetchUserExerciseGymUnit(exerciseId, gymId) {
  if (exerciseId == null || gymId == null) return null
  const { data, error } = await getClient()
    .from('user_exercise_gym_units')
    .select('weight_unit')
    .eq('exercise_id', exerciseId)
    .eq('gym_id', gymId)
    .maybeSingle()

  if (error) throw error
  return data?.weight_unit ?? null
}

// Fija (o borra, si weightUnit es null = "heredar global") la unidad de un (ejercicio, gym).
export async function upsertUserExerciseGymUnit({ userId, exerciseId, gymId, weightUnit }) {
  const client = getClient()
  if (!weightUnit) {
    const { error } = await client
      .from('user_exercise_gym_units')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('gym_id', gymId)
    if (error) throw error
    return null
  }
  const { data, error } = await client
    .from('user_exercise_gym_units')
    .upsert({
      user_id: userId,
      exercise_id: exerciseId,
      gym_id: gymId,
      weight_unit: weightUnit,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,exercise_id,gym_id' })
    .select('weight_unit')
    .single()

  if (error) throw error
  return data?.weight_unit ?? null
}

// user_exercise_overrides guarda solo notas (la unidad vive en user_exercise_gym_units).
export async function fetchUserExerciseOverride(exerciseId) {
  const { data, error } = await getClient()
    .from('user_exercise_overrides')
    .select('notes')
    .eq('exercise_id', exerciseId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertUserExerciseOverride({ userId, exerciseId, notes }) {
  const { data, error } = await getClient()
    .from('user_exercise_overrides')
    .upsert({
      user_id: userId,
      exercise_id: exerciseId,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,exercise_id' })
    .select('notes')
    .single()

  if (error) throw error
  return data
}

// ============================================
// DELETE
// ============================================

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
