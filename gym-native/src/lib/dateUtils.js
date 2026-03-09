/**
 * Utilidades para formateo de fechas
 */

/**
 * Formatea una fecha en formato largo (ej: "lunes, 15 de enero de 2024")
 * @param {string} dateStr - Fecha en formato ISO
 * @param {string} locale - Locale para formateo (default: 'es-ES')
 * @returns {string}
 */
export function formatFullDate(dateStr, locale = 'es-ES') {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Formatea una fecha en formato corto (ej: "15 ene")
 * @param {string} dateStr - Fecha en formato ISO
 * @param {string} locale - Locale para formateo (default: 'es-ES')
 * @returns {string}
 */
export function formatShortDate(dateStr, locale = 'es-ES') {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Formatea la hora de una fecha (ej: "14:30")
 * @param {string} dateStr - Fecha en formato ISO
 * @param {string} locale - Locale para formateo (default: 'es-ES')
 * @returns {string}
 */
export function formatTime(dateStr, locale = 'es-ES') {
  const date = new Date(dateStr)
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formatea una fecha de forma relativa (ej: "Hoy", "Ayer", "Hace 3 días")
 * @param {string} dateStr - Fecha en formato ISO
 * @returns {string}
 */
export function formatRelativeDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `Hace ${weeks} sem`
  }
  const months = Math.floor(diffDays / 30)
  return `Hace ${months} mes${months > 1 ? 'es' : ''}`
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {string|Date} date1 - Primera fecha
 * @param {string|Date} date2 - Segunda fecha (default: ahora)
 * @returns {number} Diferencia en días
 */
export function getDaysDifference(date1, date2 = new Date()) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffMs = d2 - d1
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Obtiene la clave de fecha para agrupar (YYYY-MM-DD)
 * @param {string} dateStr - Fecha en formato ISO
 * @returns {string}
 */
export function getDateKey(dateStr) {
  return dateStr.split('T')[0]
}
