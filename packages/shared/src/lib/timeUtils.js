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
 * Igual que formatSecondsToMMSS pero tolerante: redondea decimales y devuelve '' si no hay valor.
 * Es el formato del RITMO (min/km), donde el dato llega de BD y puede venir nulo.
 * @param {number|null|undefined} totalSeconds
 * @returns {string} "5:00", o '' si no hay valor
 */
export function formatSecondsAsMMSS(totalSeconds) {
  if (!totalSeconds && totalSeconds !== 0) return ''
  return formatSecondsToMMSS(Math.round(Number(totalSeconds)))
}

/**
 * Formatea segundos transcurridos en formato MM:SS o H:MM:SS si supera la hora.
 * @param {number} seconds - Segundos totales
 * @returns {string} Formato "MM:SS" o "H:MM:SS"
 */
export function formatElapsedSeconds(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Formato ÚNICO de una duración registrada (serie de tiempo): "45s" por debajo del minuto,
 * "20:00 min" hasta la hora y "1:12:30" a partir de ahí. Por qué: la duración se guarda en
 * segundos y pintarla en crudo es ilegible en cuanto pasa del minuto ("1200s"); por debajo del
 * minuto el mm:ss ("0:45") es más ruidoso que "45s".
 * ⚠️ El " min" NO es decorativo: "24:00" a secas se lee como horas tan fácil como como minutos.
 * Con 3 segmentos ("3:24:00") no hace falta, ahí las horas ya se ven.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0))
  if (safe < 60) return `${safe}s`
  const formatted = formatElapsedSeconds(safe)
  return safe < 3600 ? `${formatted} min` : formatted
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
