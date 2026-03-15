/**
 * Utilidades para generación de calendario
 */

/**
 * Obtiene el día de la semana ajustado (lunes = 0, domingo = 6)
 * @param {Date} date - Fecha
 * @returns {number} Día de la semana (0-6, lunes-domingo)
 */
export function getAdjustedDayOfWeek(date) {
  let day = date.getDay() - 1
  if (day < 0) day = 6
  return day
}

/**
 * Agrupa sesiones por fecha
 * @param {Array} sessions - Array de sesiones con started_at
 * @returns {Map} Mapa de dateKey -> sessions[]
 */
export function groupSessionsByDate(sessions) {
  const map = new Map()
  if (!sessions) return map

  sessions.forEach(session => {
    const dateKey = new Date(session.started_at).toDateString()
    if (!map.has(dateKey)) {
      map.set(dateKey, [])
    }
    map.get(dateKey).push(session)
  })

  return map
}

/**
 * Extrae grupos musculares únicos de las sesiones de un día
 * @param {Array} sessions - Sesiones del día
 * @returns {Array} Array de nombres de grupos musculares
 */
export function extractMuscleGroupsFromSessions(sessions) {
  const muscleGroups = new Set()
  sessions.forEach(session => {
    session.muscleGroups?.forEach(mg => muscleGroups.add(mg))
  })
  return Array.from(muscleGroups)
}

/**
 * Genera los datos del calendario para un mes
 * @param {Date} currentDate - Fecha actual (para obtener mes y año)
 * @param {Array} sessions - Sesiones de entrenamiento
 * @returns {Array} Array de días del calendario (null para días vacíos)
 */
export function generateCalendarDays(currentDate, sessions) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startDayOfWeek = getAdjustedDayOfWeek(firstDay)
  const sessionsByDate = groupSessionsByDate(sessions)

  const days = []

  // Días vacíos al inicio
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null)
  }

  // Días del mes
  const today = new Date().toDateString()
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const dateKey = date.toDateString()
    const daySessions = sessionsByDate.get(dateKey) || []
    const muscleGroups = extractMuscleGroupsFromSessions(daySessions)

    days.push({
      day,
      date,
      dateKey,
      sessions: daySessions,
      muscleGroups,
      isToday: dateKey === today,
    })
  }

  return days
}

/**
 * Obtiene el nombre del mes en formato largo
 * @param {Date} date - Fecha
 * @param {string} locale - Locale (default: 'es-ES')
 * @returns {string} Nombre del mes y año
 */
export function getMonthName(date, locale = 'es-ES') {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

/**
 * Navega al mes anterior
 * @param {Date} currentDate - Fecha actual
 * @returns {Date} Primera día del mes anterior
 */
export function getPreviousMonth(currentDate) {
  return new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
}

/**
 * Navega al mes siguiente
 * @param {Date} currentDate - Fecha actual
 * @returns {Date} Primer día del mes siguiente
 */
export function getNextMonth(currentDate) {
  return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
}
