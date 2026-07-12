import { getClient } from './_client.js'
import { recalculateExercisePRs } from './exerciseStatsApi.js'

// ============================================
// GYMS CRUD
// ============================================

export async function fetchGyms() {
  const { data, error } = await getClient()
    .from('gyms')
    .select('id, name, is_default, created_at')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createGym({ userId, name, isDefault = false }) {
  const { data, error } = await getClient()
    .from('gyms')
    .insert({ user_id: userId, name: name || null, is_default: isDefault })
    .select('id, name, is_default, created_at')
    .single()

  if (error) throw error
  return data
}

export async function renameGym({ id, name }) {
  const { data, error } = await getClient()
    .from('gyms')
    .update({ name: name || null })
    .eq('id', id)
    .select('id, name, is_default, created_at')
    .single()

  if (error) throw error
  return data
}

export async function deleteGym(id) {
  const { error } = await getClient()
    .from('gyms')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Devuelve el gym por defecto del usuario, creándolo si todavía no existe
 * (usuarios nuevos sin histórico).
 */
export async function ensureDefaultGym(userId) {
  const gyms = await fetchGyms()
  if (gyms.length > 0) {
    return gyms.find(g => g.is_default) || gyms[0]
  }
  return createGym({ userId, name: null, isDefault: true })
}

/**
 * Nº de sesiones asociadas a un gym. Se usa para impedir el borrado de gyms con
 * historial (en v1 solo se pueden renombrar).
 */
export async function fetchGymSessionCount(gymId) {
  const { count, error } = await getClient()
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)

  if (error) throw error
  return count || 0
}

// ============================================
// ASIGNACIÓN DE GYM A SESIONES
// ============================================

/**
 * Cambia el gym de una sesión EN CURSO (sin stats todavía). Solo actualiza
 * workout_sessions; los PRs se calcularán al finalizar la sesión con este gym.
 */
export async function updateSessionGym({ sessionId, gymId }) {
  const { error } = await getClient()
    .from('workout_sessions')
    .update({ gym_id: gymId })
    .eq('id', sessionId)

  if (error) throw error
}

/**
 * Reasigna el gym de una sesión PASADA (completada): mueve la sesión y sus stats
 * al nuevo gym y recalcula los PRs de cada ejercicio afectado en el gym de origen
 * Y en el de destino (ambas líneas temporales cambian).
 */
export async function reassignSessionGym({ sessionId, newGymId }) {
  const client = getClient()

  const { data: session, error: sErr } = await client
    .from('workout_sessions')
    .select('gym_id, started_at')
    .eq('id', sessionId)
    .single()
  if (sErr) throw sErr

  const oldGymId = session.gym_id
  if (oldGymId === newGymId) return

  // Ejercicios afectados (por sus stats en esta sesión)
  const { data: statsRows, error: statsErr } = await client
    .from('exercise_session_stats')
    .select('exercise_id')
    .eq('session_id', sessionId)
  if (statsErr) throw statsErr
  const exerciseIds = [...new Set((statsRows || []).map(r => r.exercise_id))]

  // Mover sesión + stats
  const { error: wsErr } = await client
    .from('workout_sessions')
    .update({ gym_id: newGymId })
    .eq('id', sessionId)
  if (wsErr) throw wsErr

  const { error: essErr } = await client
    .from('exercise_session_stats')
    .update({ gym_id: newGymId })
    .eq('session_id', sessionId)
  if (essErr) throw essErr

  // Recalcular PRs en ambos gyms desde la fecha de la sesión movida
  await Promise.all(
    exerciseIds.flatMap(eid => [
      recalculateExercisePRs(eid, session.started_at, oldGymId),
      recalculateExercisePRs(eid, session.started_at, newGymId),
    ])
  )

  return { affectedExerciseIds: exerciseIds, oldGymId, newGymId }
}
