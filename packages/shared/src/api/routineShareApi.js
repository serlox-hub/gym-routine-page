import { getClient } from './_client.js'
import { buildRoutineExport, importRoutine } from './routineIOApi.js'

/** The share link no longer works: never shared, sharing stopped, or the routine was deleted. */
export class SharedRoutineNotFoundError extends Error {
  constructor() {
    super('Shared routine not found')
    this.name = 'SharedRoutineNotFoundError'
  }
}

/**
 * Turns sharing on for one of the caller's routines. Idempotent: an already shared routine keeps
 * its token, so the link it had keeps working.
 * @param {number|string} routineId
 * @returns {Promise<string>} the share token
 */
export async function enableRoutineShare(routineId) {
  const { data, error } = await getClient().rpc('enable_routine_share', { p_routine_id: Number(routineId) })
  if (error) throw error
  return data
}

/**
 * Turns sharing off. The current link stops working for everyone, and turning it on again creates a
 * new one.
 * @param {number|string} routineId
 * @returns {Promise<void>}
 */
export async function disableRoutineShare(routineId) {
  const { error } = await getClient().rpc('disable_routine_share', { p_routine_id: Number(routineId) })
  if (error) throw error
}

/**
 * Reads a shared routine by its token, with or without a session.
 * @param {string} token
 * @returns {Promise<object|null>} the export JSON, or null when the link is dead. A network or server
 *   error throws: it is not a dead link.
 */
export async function fetchSharedRoutine(token) {
  const { data, error } = await getClient().rpc('get_shared_routine', { p_token: token })
  if (error) throw error
  return data ? buildRoutineExport(data) : null
}

/**
 * Copies a shared routine into the caller's routines, through the same path as a JSON import.
 * `updateExercises: false`: the owner's exercise definitions never overwrite the receiver's own.
 * @param {string} token
 * @param {string} userId
 * @returns {Promise<object>} the new routine
 */
export async function importSharedRoutine(token, userId) {
  const exportData = await fetchSharedRoutine(token)
  if (!exportData) throw new SharedRoutineNotFoundError()
  return importRoutine(exportData, userId, { updateExercises: false })
}
