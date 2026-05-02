/**
 * Utilidades para la pantalla Home rediseñada.
 */

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
 * Devuelve la fecha de hoy como string YYYY-MM-DD.
 * @returns {string}
 */
export function getTodayDateStr() {
  return toDateStr(new Date())
}

// ============================================
// INTERNAL
// ============================================

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
