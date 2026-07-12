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
