/**
 * Qué hace un botón de "arrancar entrenamiento" según el estado de sesión.
 *
 * Vive aquí porque web y native derivaban por separado los mismos condicionales
 * (y su estilo), así que cualquier cambio de reglas se olvidaba en una de las dos.
 * Solo cabe UNA sesión a la vez, así que todos estos botones tienen un estado
 * "bloqueado" que hay que saber distinguir de "cargando".
 */
export const WORKOUT_START_ACTION = {
  RESUME: 'resume',    // la sesión en marcha es la de este botón: volver a ella
  START: 'start',      // arrancar una sesión nueva
  BLOCKED: 'blocked',  // hay OTRA sesión en marcha: solo cabe una a la vez
  BUSY: 'busy',        // arranque en vuelo o datos sin cargar, ignorar pulsaciones
}

/**
 * Botón de entrenamiento libre (Home).
 *
 * Una sesión en marcha MANDA sobre `isStarting`: si ya hay sesión, el arranque no
 * está en vuelo, y devolver BUSY escondería el estado real.
 *
 * `hasSynced` a false significa "todavía no sé si hay sesión activa", que NO es lo
 * mismo que "no hay". Sin distinguirlos se puede arrancar un entrenamiento encima de
 * otro en la ventana entre el login y la primera sincronización (issue #30). Solo
 * importa cuando el estado local dice que no hay sesión: si dice que sí, eso ya es
 * información positiva y no hay nada que esperar.
 *
 * @param {object} params
 * @param {boolean} params.hasActiveSession - hay una sesión en marcha (de rutina o libre)
 * @param {number|string|null} params.routineDayId - día de rutina de la sesión activa; null/undefined = libre
 * @param {boolean} [params.isStarting] - la mutación de arranque está en vuelo
 * @param {boolean} [params.hasSynced] - ya se sabe el estado de sesión del servidor
 * @returns {'resume'|'start'|'blocked'|'busy'}
 */
export function getFreeWorkoutAction({ hasActiveSession, routineDayId, isStarting = false, hasSynced = true } = {}) {
  if (hasActiveSession) {
    return routineDayId == null ? WORKOUT_START_ACTION.RESUME : WORKOUT_START_ACTION.BLOCKED
  }
  if (!hasSynced) return WORKOUT_START_ACTION.BUSY
  return isStarting ? WORKOUT_START_ACTION.BUSY : WORKOUT_START_ACTION.START
}

/**
 * Botón de arrancar un día de rutina (DayCard).
 *
 * Aquí BUSY va PRIMERO, al contrario que en el botón de libre: este botón necesita los
 * bloques cargados para poder arrancar, así que mientras cargan no puede hacer nada,
 * ni siquiera reanudar. Es la precedencia que ya tenía el `disabled` de los dos DayCard.
 *
 * @param {object} params
 * @param {boolean} params.hasActiveSession - hay una sesión en marcha
 * @param {number|string|null} params.activeRoutineDayId - día de la sesión activa
 * @param {number|string} params.dayId - día de este botón
 * @param {boolean} [params.isStarting] - la mutación de arranque está en vuelo
 * @param {boolean} [params.isLoading] - los bloques del día aún no están cargados
 * @param {boolean} [params.hasSynced] - ya se sabe el estado de sesión del servidor
 * @returns {'resume'|'start'|'blocked'|'busy'}
 */
export function getRoutineDayAction({ hasActiveSession, activeRoutineDayId, dayId, isStarting = false, isLoading = false, hasSynced = true } = {}) {
  if (isStarting || isLoading) return WORKOUT_START_ACTION.BUSY
  if (!hasActiveSession) return hasSynced ? WORKOUT_START_ACTION.START : WORKOUT_START_ACTION.BUSY
  // Ids de día: web los recibe como string desde la ruta y native como número.
  return String(activeRoutineDayId) === String(dayId)
    ? WORKOUT_START_ACTION.RESUME
    : WORKOUT_START_ACTION.BLOCKED
}

// Token que levanta `start_workout_session` cuando el usuario ya tiene una sesión en curso
// (migración 058). Es el contrato con la BD: no mires el nombre del índice, que puede cambiar.
export const SESSION_ALREADY_IN_PROGRESS = 'session_already_in_progress'

/**
 * ¿El fallo al arrancar es "ya tienes una sesión en marcha" y no un error cualquiera?
 * Merece su propio mensaje: es un estado normal de la app, no una avería.
 * @param {{message?: string, code?: string}|null} error - error de supabase-js
 * @returns {boolean}
 */
export function isSessionAlreadyInProgressError(error) {
  return Boolean(error?.message?.includes(SESSION_ALREADY_IN_PROGRESS))
}
