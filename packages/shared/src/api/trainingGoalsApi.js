import { getClient } from './_client.js'

/**
 * Obtiene las fechas de sesiones completadas en un rango.
 * Solo necesitamos completed_at para contar por semana.
 */
export async function fetchCompletedSessionDates({ userId, from }) {
  const { data, error } = await getClient()
    .from('workout_sessions')
    .select('id, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', from)
    .order('completed_at', { ascending: false })

  if (error) throw error
  return data || []
}
