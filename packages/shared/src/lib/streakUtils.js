/**
 * Utilidades para calcular racha de ciclos de entrenamiento.
 *
 * Un ciclo dura N dias (por defecto 7, pero configurable).
 * Los ciclos se anclan al lunes 1 de enero de 2024, de modo que
 * con cycleLength=7 se obtienen semanas lunes-domingo (ISO).
 *
 * - Si el ciclo cumple el objetivo de dias → suma a la racha.
 * - Si el ciclo esta marcado como descanso → se ignora (no suma ni rompe).
 * - Si no cumple → la racha se rompe.
 */

const DAY_LABELS_MONDAY = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_LABELS_SUNDAY = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

// Anclas para calcular ciclos según inicio de semana
const ANCHOR_MONDAY = new Date(2024, 0, 1) // Lunes 1 ene 2024
ANCHOR_MONDAY.setHours(0, 0, 0, 0)
const ANCHOR_SUNDAY = new Date(2023, 11, 31) // Domingo 31 dic 2023
ANCHOR_SUNDAY.setHours(0, 0, 0, 0)

function getCycleAnchor(weekStartDay) {
  return weekStartDay === 'sunday' ? ANCHOR_SUNDAY : ANCHOR_MONDAY
}

// ============================================
// HELPERS INTERNOS
// ============================================

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysBetween(a, b) {
  const msA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const msB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.floor((msB - msA) / 86400000)
}

function getDayLabel(date, weekStartDay = 'monday') {
  const labels = weekStartDay === 'sunday' ? DAY_LABELS_SUNDAY : DAY_LABELS_MONDAY
  const jsDay = date.getDay() // 0=Sun, 6=Sat
  if (weekStartDay === 'sunday') return labels[jsDay]
  // monday start: Mon=0, Tue=1, ..., Sun=6
  return labels[jsDay === 0 ? 6 : jsDay - 1]
}

// ============================================
// CICLOS
// ============================================

/**
 * Devuelve la fecha de inicio del ciclo que contiene la fecha dada.
 * @param {Date} date
 * @param {number} cycleLength - Duracion del ciclo en dias
 * @returns {Date}
 */
export function getCycleStart(date, cycleLength = 7, weekStartDay = 'monday') {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const anchor = getCycleAnchor(weekStartDay)
  const days = daysBetween(anchor, d)
  const offset = ((days % cycleLength) + cycleLength) % cycleLength
  const start = new Date(d)
  start.setDate(start.getDate() - offset)
  return start
}

/**
 * Devuelve una clave unica para el ciclo (fecha de inicio YYYY-MM-DD).
 * @param {Date} date
 * @param {number} cycleLength
 * @returns {string}
 */
export function getCycleKey(date, cycleLength = 7, weekStartDay = 'monday') {
  return toDateStr(getCycleStart(date, cycleLength, weekStartDay))
}

/**
 * Cuenta sesiones completadas por ciclo.
 * @param {Array<{completed_at: string}>} sessions
 * @param {number} cycleLength
 * @returns {Record<string, number>}
 */
export function countSessionsByCycle(sessions, cycleLength = 7, weekStartDay = 'monday') {
  const counts = {}
  for (const session of sessions) {
    const key = getCycleKey(new Date(session.completed_at), cycleLength, weekStartDay)
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

/**
 * Calcula la racha de ciclos consecutivos cumpliendo el objetivo.
 * El ciclo en curso NO cuenta (esta en progreso).
 *
 * @param {Record<string, number>} sessionsByCycle
 * @param {number} target - Sesiones objetivo por ciclo
 * @param {string[]} restCycles - Ciclos de descanso (claves YYYY-MM-DD)
 * @param {number} cycleLength
 * @param {Date} [now]
 * @returns {number}
 */
export function calculateStreak(sessionsByCycle, target, restCycles = [], cycleLength = 7, now = new Date(), weekStartDay = 'monday') {
  const restSet = new Set(restCycles)
  let streak = 0

  const currentStart = getCycleStart(now, cycleLength, weekStartDay)
  const prevStart = new Date(currentStart)
  prevStart.setDate(prevStart.getDate() - cycleLength)

  // Limite razonable (2 anos de ciclos)
  const maxIter = Math.ceil((365 * 2) / cycleLength)
  const cursor = new Date(prevStart)

  for (let i = 0; i < maxIter; i++) {
    const key = toDateStr(cursor)

    if (restSet.has(key)) {
      cursor.setDate(cursor.getDate() - cycleLength)
      continue
    }

    const count = sessionsByCycle[key] || 0
    if (count >= target) {
      streak++
      cursor.setDate(cursor.getDate() - cycleLength)
    } else {
      break
    }
  }

  return streak
}

/**
 * Progreso del ciclo en curso.
 * @param {Record<string, number>} sessionsByCycle
 * @param {number} target
 * @param {number} cycleLength
 * @param {Date} [now]
 * @returns {{ completed: number, target: number, isComplete: boolean }}
 */
export function getCurrentCycleProgress(sessionsByCycle, target, cycleLength = 7, now = new Date(), weekStartDay = 'monday') {
  const key = getCycleKey(now, cycleLength, weekStartDay)
  const completed = sessionsByCycle[key] || 0
  return { completed, target, isComplete: completed >= target }
}

/**
 * Determina si el ciclo en curso esta marcado como descanso.
 * @param {string[]} restCycles
 * @param {number} cycleLength
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isCurrentCycleRest(restCycles, cycleLength = 7, now = new Date(), weekStartDay = 'monday') {
  const key = getCycleKey(now, cycleLength, weekStartDay)
  return restCycles.includes(key)
}

/**
 * Clave del ciclo en curso.
 * @param {number} cycleLength
 * @param {Date} [now]
 * @returns {string}
 */
export function getCurrentCycleKey(cycleLength = 7, now = new Date(), weekStartDay = 'monday') {
  return getCycleKey(now, cycleLength, weekStartDay)
}

/**
 * Devuelve la info de cada dia del ciclo actual con sus sesiones.
 * @param {Array<{id: string, completed_at: string}>} sessions
 * @param {number} cycleLength
 * @param {Date} [now]
 * @returns {Array<{label: string, date: Date, dateStr: string, sessions: Array, hasSession: boolean, isToday: boolean, isPast: boolean}>}
 */
export function getCurrentCycleDays(sessions, cycleLength = 7, now = new Date(), weekStartDay = 'monday') {
  const start = getCycleStart(now, cycleLength, weekStartDay)
  const todayStr = toDateStr(now)
  const days = []

  for (let i = 0; i < cycleLength; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const dateStr = toDateStr(date)

    const daySessions = (sessions || []).filter(
      s => toDateStr(new Date(s.completed_at)) === dateStr
    )

    days.push({
      label: getDayLabel(date, weekStartDay),
      date,
      dateStr,
      sessions: daySessions,
      hasSession: daySessions.length > 0,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
    })
  }

  return days
}

/**
 * Devuelve la ultima sesion del ciclo actual (la mas reciente).
 * @param {Array} cycleDays - resultado de getCurrentCycleDays
 * @returns {Object|null}
 */
export function getLastCycleSession(cycleDays) {
  for (let i = cycleDays.length - 1; i >= 0; i--) {
    const day = cycleDays[i]
    if (day.hasSession) {
      return day.sessions[day.sessions.length - 1]
    }
  }
  return null
}

// ============================================
// LEGACY — funciones basadas en semanas ISO (para tests existentes)
// ============================================

export function getMonday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

export function getISOWeekKey(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -3 : 4 - day
  d.setDate(d.getDate() + diff)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}

export function countSessionsByWeek(sessions) {
  const counts = {}
  for (const session of sessions) {
    const weekKey = getISOWeekKey(new Date(session.completed_at))
    counts[weekKey] = (counts[weekKey] || 0) + 1
  }
  return counts
}

/** @deprecated Usa calculateStreak con cycleLength */
export function calculateStreakByWeek(sessionsByWeek, daysPerWeek, restWeeks = [], now = new Date()) {
  const restSet = new Set(restWeeks)
  let streak = 0
  const monday = getMonday(now)
  monday.setDate(monday.getDate() - 7)
  for (let i = 0; i < 104; i++) {
    const weekKey = getISOWeekKey(monday)
    if (restSet.has(weekKey)) {
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

export function getCurrentWeekProgress(sessionsByWeek, daysPerWeek, now = new Date()) {
  const weekKey = getISOWeekKey(now)
  const completed = sessionsByWeek[weekKey] || 0
  return { completed, target: daysPerWeek, isComplete: completed >= daysPerWeek }
}

export function isCurrentWeekRest(restWeeks, now = new Date()) {
  const weekKey = getISOWeekKey(now)
  return restWeeks.includes(weekKey)
}

export function getCurrentWeekKey(now = new Date()) {
  return getISOWeekKey(now)
}

export function getCurrentWeekDays(sessions, now) {
  return getCurrentCycleDays(sessions, 7, now)
}
