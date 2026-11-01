/**
 * Utilidades para la pantalla Home rediseñada.
 */

import {
  STREAK_CYCLE_LENGTH, countSessionsByCycle, getCurrentCycleDays, getCurrentCycleKey,
  getCurrentCycleProgress, getCycleDateRange, getCycleKey,
} from './streakUtils.js'
import { formatShortDate, toDateLocale } from './dateUtils.js'

// ============================================
// GREETING
// ============================================

/**
 * Devuelve la clave i18n del saludo según la hora del día.
 * @param {number} hour - Hora (0-23)
 * @returns {string} Clave i18n
 */
export function getGreetingKey(hour) {
  if (hour >= 0 && hour < 12) return 'common:home.greetingMorning'
  if (hour >= 12 && hour < 18) return 'common:home.greetingAfternoon'
  return 'common:home.greetingEvening'
}

// ============================================
// NEXT ROUTINE DAY
// ============================================

/**
 * Dado un array de routine_days ordenados por sort_order y el ID del último
 * día completado, devuelve el siguiente día (wrap-around circular).
 * Si lastCompletedDayId es null/undefined, devuelve el primer día.
 *
 * @param {Array<{id: number, sort_order: number}>} routineDays - Días ordenados por sort_order
 * @param {number|null} lastCompletedDayId - ID del último día completado
 * @returns {Object|null} Siguiente día, o null si no hay días
 */
export function getNextRoutineDay(routineDays, lastCompletedDayId) {
  if (!routineDays || routineDays.length === 0) return null
  if (!lastCompletedDayId) return routineDays[0]

  const lastIndex = routineDays.findIndex(d => d.id === lastCompletedDayId)
  if (lastIndex === -1) return routineDays[0]

  const nextIndex = (lastIndex + 1) % routineDays.length
  return routineDays[nextIndex]
}

// ============================================
// CYCLE DURATION CHART
// ============================================

/**
 * Transforma los días del ciclo actual y las sesiones en datos para un bar chart
 * de duración por día de la semana.
 *
 * @param {Array<{label: string, dateStr: string, hasSession: boolean}>} cycleDays - De getCurrentCycleDays()
 * @param {Array<{completed_at: string, duration_minutes: number}>} sessions - Sesiones con duración
 * @returns {Array<{label: string, durationMinutes: number, dateStr: string, hasSession: boolean}>}
 */
export function transformSessionsToCycleDurationChart(cycleDays, sessions) {
  if (!cycleDays || cycleDays.length === 0) return []

  const sessionsByDate = {}
  for (const s of (sessions || [])) {
    if (!s.completed_at || !s.duration_minutes) continue
    const dateStr = toDateStr(new Date(s.completed_at))
    sessionsByDate[dateStr] = (sessionsByDate[dateStr] || 0) + s.duration_minutes
  }

  const values = cycleDays.map(day => sessionsByDate[day.dateStr] || 0)
  const maxVal = Math.max(...values, 1)

  return cycleDays.map((day, i) => ({
    label: day.label,
    durationMinutes: values[i],
    dateStr: day.dateStr,
    hasSession: day.hasSession,
  }))
}

// ============================================
// STREAK CARD
// ============================================

// Cuántos ciclos hacia atrás deja deslizar el widget de racha
export const STREAK_MAX_BACK = -12

/**
 * Datos del ciclo que muestra el widget de racha, desplazado `cycleOffset` ciclos
 * desde el actual (negativo = pasado). Web y native lo pintan igual; cada app solo
 * pone el estilo de las barras.
 *
 * @param {{ sessions?: Array, restCycles?: string[], daysPerCycle?: number|null, weekStartDay?: string }} goal - De useTrainingGoal()
 * @param {number} [cycleOffset]
 * @param {Date} [now]
 * @param {{ dayLabels: string[], locale: string }} format - Iniciales (getWeekdayInitials) e idioma de la app (`i18n.language`) para el rango de fechas
 * @returns {{ cycleKey: string, chartData: Array, chartMax: number, emptyBarValue: number, dateRangeLabel: string, progress: { completed: number, target: number|null|undefined, isComplete: boolean, percent: number }, isRest: boolean }}
 */
export function getViewedCycle(goal, cycleOffset = 0, now = new Date(), { dayLabels, locale }) {
  const sessions = goal.sessions ?? []
  const restCycles = goal.restCycles ?? []
  const weekStartDay = goal.weekStartDay ?? 'monday'
  const { daysPerCycle } = goal
  const referenceDate = getCycleReferenceDate(cycleOffset, now)

  const cycleKey = getCurrentCycleKey(STREAK_CYCLE_LENGTH, referenceDate, weekStartDay)
  const cycleDays = getCurrentCycleDays(sessions, STREAK_CYCLE_LENGTH, referenceDate, weekStartDay, now, dayLabels)
  const chartData = transformSessionsToCycleDurationChart(cycleDays, sessions)
  const sessionsByCycle = countSessionsByCycle(sessions, STREAK_CYCLE_LENGTH, weekStartDay)
  const { start, end } = getCycleDateRange(STREAK_CYCLE_LENGTH, referenceDate, weekStartDay)
  const progress = getCurrentCycleProgress(sessionsByCycle, daysPerCycle, STREAK_CYCLE_LENGTH, referenceDate, weekStartDay)

  return {
    cycleKey,
    chartData,
    ...calculateChartMetrics(chartData),
    dateRangeLabel: `${formatShortDate(start, toDateLocale(locale))} – ${formatShortDate(end, toDateLocale(locale))}`,
    progress: { ...progress, percent: daysPerCycle ? Math.min((progress.completed / daysPerCycle) * 100, 100) : 0 },
    isRest: restCycles.includes(cycleKey),
  }
}

// ============================================
// VIEWED WEEK (streak card + stats row)
// ============================================

/**
 * Reference date of the week `cycleOffset` weeks from `now` (negative = past). The streak card
 * and the stats row both start from it, so they always agree on which days the week has.
 * @param {number} cycleOffset - Integer in [STREAK_MAX_BACK, 0]
 * @param {Date} [now]
 * @returns {Date} now + cycleOffset * STREAK_CYCLE_LENGTH days, same time of day
 */
export function getCycleReferenceDate(cycleOffset, now = new Date()) {
  const referenceDate = new Date(now)
  referenceDate.setDate(referenceDate.getDate() + cycleOffset * STREAK_CYCLE_LENGTH)
  return referenceDate
}

/**
 * Query range of the week `cycleOffset` weeks from `now`, as instants: `session_date` is an
 * instant, and a bare date would be read as midnight UTC and drop the last day.
 * @param {number} cycleOffset
 * @param {Date} [now]
 * @param {string} [weekStartDay]
 * @returns {{ from: string, to: string }} ISO strings: local start of the first day, local 23:59:59 of the last
 */
export function getWeekQueryRange(cycleOffset, now = new Date(), weekStartDay = 'monday') {
  const { start, end } = getCycleDateRange(STREAK_CYCLE_LENGTH, getCycleReferenceDate(cycleOffset, now), weekStartDay)
  return {
    from: start.toISOString(),
    to: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString(),
  }
}

/**
 * Which relative wording names the viewed week.
 * @param {number} cycleOffset - Any value >= 0 counts as the current week
 * @returns {{ kind: 'current' } | { kind: 'last' } | { kind: 'ago', weeks: number }}
 */
export function getRelativeWeek(cycleOffset) {
  if (cycleOffset >= 0) return { kind: 'current' }
  if (cycleOffset === -1) return { kind: 'last' }
  return { kind: 'ago', weeks: -cycleOffset }
}

// i18n keys of each home label that names the viewed week, one per getRelativeWeek kind
export const VIEWED_WEEK_LABELS = {
  totalTime: { current: 'common:home.thisWeek', last: 'common:home.lastWeek', ago: 'common:home.weeksAgo' },
  prs: { current: 'common:home.prsThisWeek', last: 'common:home.prsLastWeek', ago: 'common:home.prsWeeksAgo' },
  prsTitle: { current: 'common:home.weeklyPRsTitle', last: 'common:home.weeklyPRsTitleLastWeek', ago: 'common:home.weeklyPRsTitleWeeksAgo' },
  prsEmpty: { current: 'common:home.weeklyPRsEmpty', last: 'common:home.weeklyPRsEmptyLastWeek', ago: 'common:home.weeklyPRsEmptyWeeksAgo' },
}

/**
 * i18n key and values of a label that names the viewed week: `t(label.key, label.values)`.
 * @param {number} cycleOffset
 * @param {{ current: string, last: string, ago: string }} keys - One of VIEWED_WEEK_LABELS
 * @returns {{ key: string, values?: { count: number } }}
 */
export function getViewedWeekLabel(cycleOffset, keys) {
  const week = getRelativeWeek(cycleOffset)
  if (week.kind === 'ago') return { key: keys.ago, values: { count: week.weeks } }
  return { key: keys[week.kind] }
}

/**
 * Total minutes of the week `cycleOffset` weeks from `now`: the same week, and the same sessions,
 * as the streak card's bars (getViewedCycle). Sessions without duration count 0.
 * @param {Array<{ completed_at: string, duration_minutes: number|null }>} sessions - From useTrainingGoal()
 * @param {number} cycleOffset
 * @param {Date} [now]
 * @param {string} [weekStartDay]
 * @returns {number}
 */
export function getCycleTotalMinutes(sessions, cycleOffset, now = new Date(), weekStartDay = 'monday') {
  const cycleKey = getCurrentCycleKey(STREAK_CYCLE_LENGTH, getCycleReferenceDate(cycleOffset, now), weekStartDay)
  const inCycle = (sessions || []).filter(s =>
    s.completed_at && getCycleKey(new Date(s.completed_at), STREAK_CYCLE_LENGTH, weekStartDay) === cycleKey
  )
  return calculateWeeklyDurationMinutes(inCycle)
}

// Away from Home longer than this, coming back shows the current week again
export const HOME_WEEK_RESET_MS = 15 * 60 * 1000

/**
 * Whether the viewed week goes back to the current one on returning to Home: after more than
 * HOME_WEEK_RESET_MS away, or when a new week started meanwhile (the offset is relative, so
 * "last week" would silently become another week).
 * @param {number|null} leftAt - Epoch ms when the user left Home; null while on Home
 * @param {number} [now] - Epoch ms
 * @param {string} [weekStartDay]
 * @returns {boolean}
 */
export function shouldResetViewedWeek(leftAt, now = Date.now(), weekStartDay = 'monday') {
  if (leftAt == null) return false
  if (now - leftAt > HOME_WEEK_RESET_MS) return true
  return getCurrentCycleKey(STREAK_CYCLE_LENGTH, new Date(leftAt), weekStartDay)
    !== getCurrentCycleKey(STREAK_CYCLE_LENGTH, new Date(now), weekStartDay)
}

/**
 * The offset Home renders: 0 if the stored week is due for reset, else the stored one. Lets the
 * first render after returning show the current week before enterHome commits it.
 * @param {{ cycleOffset: number, leftAt: number|null }} state - Of useHomeWeekStore
 * @param {number} [now] - Epoch ms
 * @param {string} [weekStartDay]
 * @returns {number}
 */
export function selectViewedCycleOffset(state, now = Date.now(), weekStartDay = 'monday') {
  return shouldResetViewedWeek(state.leftAt, now, weekStartDay) ? 0 : state.cycleOffset
}

/**
 * Puntos de paginación del widget de racha: como mucho `maxDots` visibles, en una
 * ventana que sigue al punto activo; los extremos se encogen si hay más fuera.
 *
 * @param {number} current - Ciclo visto (entre min y max)
 * @param {number} min
 * @param {number} max
 * @param {number} [maxDots]
 * @returns {Array<{ dotIndex: number, isActive: boolean, isEdge: boolean, size: number }>}
 */
export function getPaginationDots(current, min, max, maxDots = 5) {
  const total = max - min + 1
  const index = current - min

  let windowStart
  if (total <= maxDots || index <= 1) {
    windowStart = 0
  } else if (index >= total - 2) {
    windowStart = total - maxDots
  } else {
    windowStart = index - 2
  }

  const visibleCount = Math.min(total, maxDots)

  return Array.from({ length: visibleCount }, (_, i) => {
    const dotIndex = windowStart + i
    const isActive = dotIndex === index
    const distFromEdge = Math.min(i, visibleCount - 1 - i)
    const isEdge = total > maxDots && distFromEdge === 0 && !isActive
    return { dotIndex, isActive, isEdge, size: isActive ? 8 : isEdge ? 4 : 6 }
  })
}

// ============================================
// WEEKLY / MONTHLY STATS
// ============================================

/**
 * Suma la duración en minutos de un array de sesiones.
 * @param {Array<{duration_minutes: number}>} sessions
 * @returns {number}
 */
export function calculateWeeklyDurationMinutes(sessions) {
  if (!sessions || sessions.length === 0) return 0
  return sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
}

/**
 * Convierte minutos totales en horas y minutos.
 * @param {number} totalMinutes
 * @returns {{ hours: number, minutes: number }}
 */
export function formatDurationHoursMinutes(totalMinutes) {
  if (totalMinutes == null || totalMinutes <= 0) return { hours: 0, minutes: 0 }
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}

// ============================================
// CHART HELPERS
// ============================================

const MIN_CHART_MAX = 60
const EMPTY_BAR_RATIO = 0.06

/**
 * Calcula métricas para el chart de barras: max del eje Y y valor de barras vacías.
 * @param {Array<{durationMinutes: number}>} chartData
 * @returns {{ chartMax: number, emptyBarValue: number }}
 */
export function calculateChartMetrics(chartData) {
  const chartMax = Math.max(...(chartData || []).map(d => d.durationMinutes), MIN_CHART_MAX)
  const emptyBarValue = Math.round(chartMax * EMPTY_BAR_RATIO)
  return { chartMax, emptyBarValue }
}

/**
 * Axis max that leaves `labelHeight` px free above the tallest bar in a plot `plotHeight` px tall,
 * so the minutes printed on top of it fit inside the plot. The bars get shorter, the card does
 * not grow (issue #216).
 * @param {number} chartMax - Largest value of the chart (`calculateChartMetrics`)
 * @param {number} plotHeight - Height of the area the bars grow in, px
 * @param {number} labelHeight - Room a label needs above its bar, px
 * @returns {number}
 */
export function getChartMaxWithLabelRoom(chartMax, plotHeight, labelHeight) {
  // Without room to give (or a plot to give it in), the axis as it was: never infinite or negative
  if (!(labelHeight > 0) || !(plotHeight > labelHeight)) return chartMax
  return chartMax * plotHeight / (plotHeight - labelHeight)
}

/**
 * Devuelve la fecha de hoy como string YYYY-MM-DD.
 * @returns {string}
 */
export function getTodayDateStr() {
  return toDateStr(new Date())
}

/**
 * Convierte una fecha a string YYYY-MM-DD (zona horaria local).
 * @param {Date} date
 * @returns {string}
 */
export function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
