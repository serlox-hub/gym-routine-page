/**
 * Nombre a mostrar de un gimnasio. El gym por defecto se guarda con `name` nulo
 * y debe mostrarse con la etiqueta traducida (t('common:gym.defaultName')).
 * @param {{name?: string|null, is_default?: boolean}|null|undefined} gym
 * @param {string} defaultLabel - etiqueta traducida para el gym por defecto
 * @returns {string}
 */
export function getGymDisplayName(gym, defaultLabel = '') {
  if (!gym) return ''
  if (!gym.name) return defaultLabel
  return gym.name
}

/**
 * Resuelve el gym activo (sticky): último gym usado → gym por defecto → primero.
 * @param {Array<{id: any, is_default?: boolean}>} gyms
 * @param {any} lastGymId - id del último gym usado (persistido en preferencias)
 * @returns {object|null}
 */
export function resolveSelectedGym(gyms, lastGymId) {
  if (!gyms || gyms.length === 0) return null
  if (lastGymId != null) {
    const found = gyms.find(g => String(g.id) === String(lastGymId))
    if (found) return found
  }
  return gyms.find(g => g.is_default) || gyms[0]
}

/**
 * Qué hace el botón de borrar un gimnasio según su recuento de sesiones.
 *
 * Borrar un gym con sesiones no se puede deshacer (las sesiones pierden su gym y con
 * él la separación de PRs y unidades), y `deleteGym` no lo comprueba en el servidor.
 * Así que "todavía no sé cuántas tiene" (cargando o la consulta falló) NO es "no
 * tiene ninguna": mismo criterio que la sesión activa, ver CLAUDE.md.
 */
export const GYM_DELETE_ACTION = {
  DELETE: 'delete',              // sin sesiones: pedir confirmación y borrar
  HAS_SESSIONS: 'hasSessions',   // bloqueado: tiene sesiones
  UNKNOWN: 'unknown',            // bloqueado: no se pudo comprobar el recuento
  BUSY: 'busy',                  // el recuento está cargando, ignorar pulsaciones
}

/**
 * @param {number|null|undefined} sessionCount - recuento de sesiones del gym; null/undefined = sin dato
 * @param {boolean} [isError] - la consulta del recuento falló
 * @returns {'delete'|'hasSessions'|'unknown'|'busy'}
 */
export function getGymDeleteAction(sessionCount, isError = false) {
  if (sessionCount == null) return isError ? GYM_DELETE_ACTION.UNKNOWN : GYM_DELETE_ACTION.BUSY
  return sessionCount > 0 ? GYM_DELETE_ACTION.HAS_SESSIONS : GYM_DELETE_ACTION.DELETE
}
