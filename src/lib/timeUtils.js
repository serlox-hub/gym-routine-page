/**
 * Utilidades para formateo de tiempo y duraciones
 */

/**
 * Formatea segundos a formato MM:SS
 * @param {number} seconds - Segundos totales
 * @returns {string} Formato "M:SS" o "MM:SS"
 */
export function formatSecondsToMMSS(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Formatea segundos para mostrar en descanso (ej: "45s", "2min", "1:30")
 * @param {number} seconds - Segundos totales
 * @returns {string}
 */
export function formatRestTimeDisplay(seconds) {
  if (seconds < 60) return `${seconds}s`
  if (seconds % 60 === 0) return `${seconds / 60}min`
  return formatSecondsToMMSS(seconds)
}

/**
 * Calcula la duración en minutos entre dos fechas
 * @param {string|Date} startDate - Fecha de inicio
 * @param {string|Date} endDate - Fecha de fin (default: ahora)
 * @returns {number} Duración en minutos (redondeado)
 */
export function calculateDurationMinutes(startDate, endDate = new Date()) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.round((end - start) / 60000)
}

/**
 * Convierte segundos a minutos
 * @param {number} seconds - Segundos
 * @returns {number} Minutos
 */
export function secondsToMinutes(seconds) {
  return Math.floor(seconds / 60)
}

/**
 * Convierte minutos a segundos
 * @param {number} minutes - Minutos
 * @returns {number} Segundos
 */
export function minutesToSeconds(minutes) {
  return minutes * 60
}

/**
 * Calcula el progreso del timer como porcentaje
 * @param {number} initial - Tiempo inicial en segundos
 * @param {number} remaining - Tiempo restante en segundos
 * @returns {number} Porcentaje de progreso (0-100)
 */
export function calculateTimerProgress(initial, remaining) {
  if (initial <= 0) return 0
  return ((initial - remaining) / initial) * 100
}

/**
 * Ajusta un tiempo asegurando que no sea negativo
 * @param {number} currentTime - Tiempo actual
 * @param {number} delta - Cantidad a añadir/restar
 * @returns {number} Tiempo ajustado (mínimo 0)
 */
export function adjustTime(currentTime, delta) {
  return Math.max(0, currentTime + delta)
}
