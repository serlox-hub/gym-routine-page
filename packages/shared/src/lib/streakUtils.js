/**
 * Utilidades para calcular racha de semanas de entrenamiento.
 *
 * Una semana va de lunes a domingo (ISO).
 * - Si la semana cumple el objetivo de dias → suma a la racha.
 * - Si la semana esta marcada como descanso → se ignora (no suma ni rompe).
 * - Si no cumple → la racha se rompe.
 */

/**
 * Devuelve el lunes de la semana ISO que contiene la fecha dada.
 * @param {Date} date
 * @returns {Date}
 */
export function getMonday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  // getDay: 0=dom, 1=lun ... Ajustar para que lunes=0
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

/**
 * Devuelve el identificador ISO de semana (ej. "2026-W12") para una fecha.
 * @param {Date} date
 * @returns {string}
 */
export function getISOWeekKey(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // Jueves de la misma semana ISO
  const day = d.getDay()
  const diff = day === 0 ? -3 : 4 - day
  d.setDate(d.getDate() + diff)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * Cuenta sesiones completadas por semana ISO.
 * @param {Array<{completed_at: string}>} sessions - Sesiones completadas
 * @returns {Record<string, number>} Mapa weekKey -> numero de sesiones
 */
export function countSessionsByWeek(sessions) {
  const counts = {}
  for (const session of sessions) {
    const weekKey = getISOWeekKey(new Date(session.completed_at))
    counts[weekKey] = (counts[weekKey] || 0) + 1
  }
  return counts
}

/**
 * Calcula la racha de semanas consecutivas cumpliendo el objetivo.
 * Recorre hacia atras desde la semana anterior a la actual.
 * La semana en curso NO cuenta para la racha (esta en progreso).
 *
 * @param {Record<string, number>} sessionsByWeek - Sesiones por semana
 * @param {number} daysPerWeek - Objetivo de dias por semana
 * @param {string[]} restWeeks - Semanas marcadas como descanso (ej. ["2026-W12"])
 * @param {Date} [now] - Fecha actual (para testing)
 * @returns {number} Numero de semanas consecutivas cumpliendo objetivo
 */
export function calculateStreak(sessionsByWeek, daysPerWeek, restWeeks = [], now = new Date()) {
  const restSet = new Set(restWeeks)
  const currentWeekKey = getISOWeekKey(now)
  let streak = 0

  // Empezar desde la semana anterior a la actual
  const monday = getMonday(now)
  monday.setDate(monday.getDate() - 7)

  // Limite razonable de iteraciones (2 anos)
  for (let i = 0; i < 104; i++) {
    const weekKey = getISOWeekKey(monday)

    if (restSet.has(weekKey)) {
      // Semana de descanso: ignorar
      monday.setDate(monday.getDate() - 7)
      continue
    }

    const count = sessionsByWeek[weekKey] || 0
    if (count >= daysPerWeek) {
      streak++
      monday.setDate(monday.getDate() - 7)
    } else {
      break
    }
  }

  return streak
}

/**
 * Calcula el progreso de la semana en curso.
 * @param {Record<string, number>} sessionsByWeek
 * @param {number} daysPerWeek
 * @param {Date} [now]
 * @returns {{ completed: number, target: number, isComplete: boolean }}
 */
export function getCurrentWeekProgress(sessionsByWeek, daysPerWeek, now = new Date()) {
  const weekKey = getISOWeekKey(now)
  const completed = sessionsByWeek[weekKey] || 0
  return {
    completed,
    target: daysPerWeek,
    isComplete: completed >= daysPerWeek,
  }
}

/**
 * Determina si la semana en curso esta marcada como descanso.
 * @param {string[]} restWeeks
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isCurrentWeekRest(restWeeks, now = new Date()) {
  const weekKey = getISOWeekKey(now)
  return restWeeks.includes(weekKey)
}

/**
 * Devuelve el weekKey de la semana en curso.
 * @param {Date} [now]
 * @returns {string}
 */
export function getCurrentWeekKey(now = new Date()) {
  return getISOWeekKey(now)
}
