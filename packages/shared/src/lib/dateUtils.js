import { t, getCurrentLocale } from '../i18n/index.js'
import { MAX_SESSION_DURATION_MINUTES } from './constants.js'

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
 * Compara dos timestamps por instante, no por cadena: Postgres devuelve
 * `2026-01-01T10:00:00+00:00` donde `toISOString()` da `2026-01-01T10:00:00.000Z`.
 * @param {Date|string|null} a
 * @param {Date|string|null} b
 * @returns {boolean} false si alguno no es una fecha válida
 */
export function isSameTimestamp(a, b) {
  if (a == null || b == null) return false
  const ms1 = new Date(a).getTime()
  const ms2 = new Date(b).getTime()
  if (Number.isNaN(ms1) || Number.isNaN(ms2)) return false
  return ms1 === ms2
}

/**
 * Cotas del inicio editable de una sesión: `[upper - MAX_SESSION_DURATION_MINUTES, upper]`
 * con `upper = min(completedAt ?? now, now)`. Fuente única de los límites que pintan los
 * pickers (web `min`/`max`, native `minimumDate`/`maximumDate`) y de los que aplica
 * `resolveSessionStart`.
 * @param {{ startedAt: Date|string, completedAt: Date|string|null }} session
 * @param {Date|string} [now]
 * @returns {{ minDate: Date, maxDate: Date }}
 */
export function getSessionStartBounds({ startedAt, completedAt } = {}, now = new Date()) {
  const currentMs = startedAt == null ? NaN : new Date(startedAt).getTime()
  const endMs = completedAt == null ? NaN : new Date(completedAt).getTime()
  const nowMs = new Date(now).getTime()
  // Guard clock skew (now < started_at): un reloj atrasado no puede empujar la cota
  // superior por debajo del inicio actual, que convertiría un re-blur en una mudanza.
  const guardedNowMs = Number.isNaN(currentMs) ? nowMs : Math.max(nowMs, currentMs)
  const upperMs = Number.isNaN(endMs) ? guardedNowMs : Math.min(endMs, guardedNowMs)
  return {
    minDate: new Date(upperMs - MAX_SESSION_DURATION_MINUTES * 60000),
    maxDate: new Date(upperMs),
  }
}

/**
 * Resuelve un inicio de sesión propuesto, acotándolo con `getSessionStartBounds` y
 * recalculando la duración como `fin - inicio`.
 *
 * Asimetría deliberada frente a `resolveSessionEnd`: recibe el inicio ACTUAL y una
 * entrada inválida es un no-op (devuelve ese inicio sin tocar). El fin es el campo fijo
 * aquí, así que colapsar el inicio contra él reescribiría el único valor irrecuperable
 * de la operación.
 * @param {Date|string} proposed - inicio elegido por el usuario
 * @param {{ startedAt: Date|string, completedAt: Date|string|null }} session
 * @param {Date|string} [now] - momento actual (cota superior)
 * @returns {{ startedAtISO: string|null, durationMinutes: number|null }}
 *   `durationMinutes` es null si la sesión no tiene fin: sin fin la duración no existe,
 *   e inventar `now - inicio` alimentaría las métricas semanales con un artefacto de reloj.
 */
export function resolveSessionStart(proposed, { startedAt, completedAt } = {}, now = new Date()) {
  const currentMs = startedAt == null ? NaN : new Date(startedAt).getTime()
  const endMs = completedAt == null ? NaN : new Date(completedAt).getTime()
  const hasEnd = !Number.isNaN(endMs)
  const durationFrom = (startMs) => (hasEnd ? Math.round((endMs - startMs) / 60000) : null)

  if (Number.isNaN(currentMs)) return { startedAtISO: null, durationMinutes: null }

  const proposedMs = proposed == null || proposed === '' ? NaN : new Date(proposed).getTime()
  if (Number.isNaN(proposedMs)) {
    return { startedAtISO: new Date(currentMs).toISOString(), durationMinutes: durationFrom(currentMs) }
  }

  const { minDate, maxDate } = getSessionStartBounds({ startedAt, completedAt }, now)
  const resolvedMs = Math.min(Math.max(proposedMs, minDate.getTime()), maxDate.getTime())
  return {
    startedAtISO: new Date(resolvedMs).toISOString(),
    durationMinutes: durationFrom(resolvedMs),
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
