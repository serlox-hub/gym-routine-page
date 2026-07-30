import { t, getCurrentLocale } from '../i18n/index.js'

function getDateLocale() {
  const lang = getCurrentLocale()
  return lang === 'en' ? 'en-US' : 'es-ES'
}

export function formatFullDate(dateStr, locale) {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale || getDateLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(dateStr, locale) {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale || getDateLocale(), {
    day: 'numeric',
    month: 'short',
  })
}

export function formatTime(dateStr, locale) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString(locale || getDateLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  // Diferencia en DÍAS DE CALENDARIO local, no en ventanas de 24h: una sesión de
  // ayer a las 22:00 vista hoy a las 10:00 es "ayer", no "hoy" (bug de las 24h).
  // Math.round absorbe los días de 23/25h por cambio de horario (DST).
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('common:time.today')
  if (diffDays === 1) return t('common:time.yesterday')
  if (diffDays < 7) return t('common:time.daysAgo', { count: diffDays })
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return t('common:time.weeksAgo', { count: weeks })
  }
  const months = Math.floor(diffDays / 30)
  return t('common:time.monthsAgo', { count: months })
}

export function getDaysDifference(date1, date2 = new Date()) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffMs = d2 - d1
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function getDateKey(dateStr) {
  return dateStr.split('T')[0]
}

/**
 * Parses a date input into a Date. Accepts a Date instance, an ISO timestamp,
 * or YYYY-MM-DD (interpreted as local midnight to avoid timezone shifts).
 * @param {Date|string} date
 * @returns {Date}
 */
export function parseDateInput(date) {
  if (date instanceof Date) return date
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T00:00:00`)
  }
  return new Date(date)
}

/**
 * Resolves a proposed session end timestamp, clamping it to [startedAt, now]
 * and recomputing the duration. Used when editing a finished session's end
 * (caso típico: la sesión quedó abierta y se cierra al día siguiente): el
 * inicio es fijo y el fin nunca puede ser anterior a él ni futuro.
 * @param {Date|string} proposed - end timestamp elegido por el usuario
 * @param {Date|string} startedAt - inicio de la sesión (cota inferior fija)
 * @param {Date|string} [now] - cota superior; por defecto el momento actual
 * @returns {{ completedAtISO: string, durationMinutes: number }}
 */
export function resolveSessionEnd(proposed, startedAt, now = new Date()) {
  const startedMs = new Date(startedAt).getTime()
  const nowMs = new Date(now).getTime()
  // Guard clock skew (now < startedAt): el fin nunca puede quedar antes del inicio
  const upperMs = Math.max(nowMs, startedMs)
  let endMs = new Date(proposed).getTime()
  if (Number.isNaN(endMs)) endMs = startedMs
  endMs = Math.min(Math.max(endMs, startedMs), upperMs)
  return {
    completedAtISO: new Date(endMs).toISOString(),
    durationMinutes: Math.round((endMs - startedMs) / 60000),
  }
}

/**
 * Formatea un timestamp como string local `YYYY-MM-DDTHH:mm` para usarlo como
 * value/min/max de un <input type="datetime-local"> (que es naive de zona
 * horaria y no admite segundos).
 * @param {Date|string} input
 * @returns {string} cadena vacía si la entrada no es válida
 */
export function formatDateTimeLocal(input) {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
