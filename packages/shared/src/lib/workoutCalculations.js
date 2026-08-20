/**
 * Utilidades para cálculos de entrenamiento
 */

import { t } from '../i18n/index.js'
import { SetField, getPrimaryChartField, tracksDistance, tracksLevel, tracksPace, tracksReps, tracksTime, tracksWeight } from './measurementFields.js'
import { formatSecondsToMMSS } from './timeUtils.js'

/**
 * Calcula el 1RM estimado usando la fórmula Epley
 * @param {number} weight - Peso levantado
 * @param {number} reps - Repeticiones realizadas
 * @returns {number} 1RM estimado (redondeado)
 */
export function calculateEpley1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

/**
 * Calcula el volumen total de una serie
 * @param {number} weight - Peso
 * @param {number} reps - Repeticiones
 * @returns {number} Volumen (peso × reps)
 */
export function calculateSetVolume(weight, reps) {
  if (!weight || !reps) return 0
  return weight * reps
}

/**
 * Calcula el volumen total de múltiples series
 * @param {Array<{weight: number, reps_completed: number}>} sets - Array de series
 * @returns {number} Volumen total
 */
export function calculateTotalVolume(sets) {
  if (!sets || sets.length === 0) return 0
  return sets.reduce((total, set) => {
    const weight = set.weight || 0
    const reps = set.reps_completed || set.reps || 0
    return total + (weight * reps)
  }, 0)
}

// Campo que resume la serie → unidad con la que se etiqueta en la gráfica. El peso es el único
// cuya unidad depende de la configuración (kg/lb); el resto son fijas.
const CHART_FIELD_METRIC = {
  [SetField.WEIGHT]: { column: 'weight', unit: null },
  [SetField.LEVEL]: { column: 'level', unit: 'nv' },
  [SetField.DISTANCE]: { column: 'distance_meters', unit: 'm' },
  [SetField.CALORIES]: { column: 'calories_burned', unit: 'kcal' },
  [SetField.TIME]: { column: 'time_seconds', unit: 's' },
  // El ritmo es el único donde MENOR es mejor (min/km). Va después de la distancia en la prioridad,
  // así que un ejercicio de distancia × ritmo sigue resumiéndose por distancia; solo manda cuando
  // el ritmo va solo (correr contra un ritmo objetivo, que el enum anterior no permitía expresar).
  [SetField.PACE]: { column: 'pace_seconds', unit: 's/km', lowerIsBetter: true },
  [SetField.REPS]: { column: 'reps_completed', unit: 'reps' },
}

/**
 * Mejor valor de un conjunto de series, en el campo que mejor resume el ejercicio
 * (ver getPrimaryChartField: peso si lo hay, si no nivel, si no la magnitud del trabajo).
 * @param {Array} sets - Array de series
 * @param {string[]} trackedFields - campos del ejercicio
 * @returns {{value: number, unit: string}}
 */
export function getBestValueFromSets(sets, trackedFields, { weightUnit = 'kg' } = {}) {
  if (!sets || sets.length === 0) return { value: 0, unit: '' }

  const field = getPrimaryChartField(trackedFields)
  const { column, unit, lowerIsBetter } = CHART_FIELD_METRIC[field]

  let bestValue = 0
  sets.forEach(set => {
    // `reps` (sin sufijo) es el nombre que usan las series ya transformadas para historial.
    const value = set[column] ?? (field === SetField.REPS ? set.reps : null)
    if (!value) return
    if (bestValue === 0 || (lowerIsBetter ? value < bestValue : value > bestValue)) bestValue = value
  })

  return { value: bestValue, unit: bestValue > 0 ? (unit ?? weightUnit) : '' }
}

/**
 * Obtiene el mejor 1RM de un conjunto de series
 * @param {Array<{weight: number, reps_completed: number}>} sets - Array de series
 * @returns {number} Mejor 1RM estimado
 */
export function getBest1RMFromSets(sets) {
  if (!sets || sets.length === 0) return 0

  let best1RM = 0
  sets.forEach(set => {
    if (set.weight && set.reps_completed) {
      const e1rm = calculateEpley1RM(set.weight, set.reps_completed)
      if (e1rm > best1RM) best1RM = e1rm
    }
  })
  return best1RM
}

/**
 * Transforma sesiones a datos para gráficos de progreso
 * @param {Array} sessions - Array de sesiones con sets
 * @param {string[]} trackedFields - campos del ejercicio
 * @returns {Array<{date: string, best: number, volume: number, e1rm: number, unit: string}>}
 */
export function transformSessionsToChartData(sessions, trackedFields, { weightUnit = 'kg' } = {}) {
  if (!sessions || sessions.length === 0) return []

  const sortedSessions = [...sessions].reverse()

  return sortedSessions.map(session => {
    const date = new Date(session.date)
    const dateLabel = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

    const { value: bestValue, unit } = getBestValueFromSets(session.sets, trackedFields, { weightUnit })
    const totalVolume = calculateTotalVolume(session.sets)
    const bestE1RM = getBest1RMFromSets(session.sets)

    return {
      date: dateLabel,
      best: bestValue,
      volume: Math.round(totalVolume),
      e1rm: bestE1RM,
      unit,
    }
  })
}

/**
 * Cuenta las series completadas para un ejercicio
 * @param {Object} completedSetsMap - Mapa de series completadas
 * @param {string|number} routineExerciseId - ID del ejercicio de rutina
 * @returns {number} Número de series completadas
 */
export function countCompletedSets(completedSetsMap, routineExerciseId) {
  if (!completedSetsMap) return 0
  return Object.values(completedSetsMap)
    .filter(set => set.routineExerciseId === routineExerciseId)
    .length
}

/**
 * Progreso de una sesión, a nivel de series y de ejercicios, con desglose por ejercicio.
 * Excluye ejercicios de calentamiento.
 * @param {Array} flatExercises - Lista plana de ejercicios con sessionExerciseId y series
 * @param {Object} completedSets - Mapa de series completadas (key: `sessionExerciseId-setNumber`)
 * @param {Object} exerciseSetCounts - Conteo dinámico de series por ejercicio (key: sessionExerciseId)
 * @returns {{completed: number, total: number, setsCompleted: number, setsTotal: number,
 *   setsPending: number,
 *   segments: Array<{sessionExerciseId: (string|number), setsTotal: number, setsDone: number, fillPct: number}>}}
 *   `segments` = un tramo por ejercicio no-warmup (para la barra segmentada); `fillPct` es el
 *   % de relleno de ese tramo (geometría lista para pintar, sin cálculo en el componente).
 *   Los agregados se derivan de `segments`. `setsPending` = series planificadas aún sin completar
 *   (excluye calentamiento, igual que el resto de agregados).
 */
export function calculateExerciseLevelProgress(flatExercises, completedSets, exerciseSetCounts = {}) {
  const segments = []
  if (flatExercises) {
    flatExercises.forEach(exercise => {
      if (exercise.isWarmup) return
      const key = exercise.sessionExerciseId
      const setsTotal = exerciseSetCounts[key] ?? exercise.series ?? 1
      let setsDone = 0
      for (let i = 1; i <= setsTotal; i++) {
        if (completedSets?.[`${key}-${i}`]) setsDone += 1
      }
      const fillPct = setsTotal > 0 ? (setsDone / setsTotal) * 100 : 0
      segments.push({ sessionExerciseId: key, setsTotal, setsDone, fillPct })
    })
  }
  const total = segments.length
  const completed = segments.filter(s => s.setsTotal > 0 && s.setsDone >= s.setsTotal).length
  const setsCompleted = segments.reduce((sum, s) => sum + s.setsDone, 0)
  const setsTotal = segments.reduce((sum, s) => sum + s.setsTotal, 0)
  const setsPending = Math.max(0, setsTotal - setsCompleted)
  return { completed, total, setsCompleted, setsTotal, setsPending, segments }
}

export function calculateExerciseProgress(flatExercises, completedSets, exerciseSetCounts = {}) {
  if (!flatExercises || flatExercises.length === 0) return { completed: 0, total: 0 }

  let completed = 0
  let total = 0

  flatExercises.forEach(exercise => {
    // Excluir ejercicios de calentamiento
    if (exercise.isWarmup) return

    const exerciseKey = exercise.sessionExerciseId
    // Usar el conteo del store si existe, sino usar series planificadas
    const actualSeries = exerciseSetCounts[exerciseKey] ?? exercise.series ?? 1
    total += actualSeries

    for (let i = 1; i <= actualSeries; i++) {
      if (completedSets[`${exerciseKey}-${i}`]) {
        completed++
      }
    }
  })

  return { completed, total }
}

/**
 * Filtra sesiones por mes y año
 * @param {Array} sessions - Array de sesiones
 * @param {number} year - Año a filtrar
 * @param {number} month - Mes a filtrar (0-11)
 * @returns {Array} Sesiones filtradas
 */
export function filterSessionsByMonth(sessions, year, month) {
  if (!sessions) return []
  return sessions.filter(session => {
    const sessionDate = new Date(session.started_at)
    return sessionDate.getFullYear() === year && sessionDate.getMonth() === month
  })
}

/**
 * Transforma sesiones a datos para gráfico de duración
 * @param {Array} sessions - Array de sesiones
 * @param {Date} currentDate - Fecha actual para filtrar por mes
 * @returns {Array} Datos formateados para el gráfico
 */
export function transformSessionsToDurationChartData(sessions, currentDate) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthSessions = filterSessionsByMonth(sessions, year, month)

  return monthSessions
    .filter(session => session.duration_minutes)
    .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    .map(session => {
      const date = new Date(session.started_at)
      return {
        date: date.getDate(),
        duration: session.duration_minutes,
        dayName: session.day_name || session.routine_day?.name || 'Sesión',
        fullDate: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      }
    })
}

/**
 * Calcula el promedio de duración de sesiones
 * @param {Array} chartData - Datos del gráfico con propiedad duration
 * @returns {number} Promedio redondeado
 */
export function calculateAverageDuration(chartData) {
  if (!chartData || chartData.length === 0) return 0
  return Math.round(
    chartData.reduce((sum, d) => sum + d.duration, 0) / chartData.length
  )
}

/**
 * Tarjetas de resumen del historial de un ejercicio ("Mejor 1RM", "Tiempo máx"…), a partir de lo
 * que devuelve `calculateExerciseStats`.
 *
 * ⚠️ Vive AQUÍ, pegada a `calculateExerciseStats`, porque comparten el orden de ramas: las tarjetas
 * solo pueden pedir las métricas que aquella rama calculó. Separadas (estaban duplicadas en web y
 * native) el acoplamiento solo se sostenía con un comentario, y una tarjeta pidiendo una métrica
 * no calculada sale vacía sin avisar.
 * @param {object|null} stats - salida de calculateExerciseStats
 * @param {string[]} trackedFields - campos del ejercicio
 * @param {{weightUnit?: string, distanceUnit?: string}} [units]
 * @returns {Array<{label: string, value: string|number}>} vacío si no hay stats o no hay nada que resumir
 */
export function getExerciseStatCards(stats, trackedFields, { weightUnit = 'kg', distanceUnit = 'm' } = {}) {
  if (!stats) return []

  const cards = []
  const push = (condition, key, value) => {
    if (condition) cards.push({ label: t(`workout:summary.${key}`), value })
  }

  if (tracksWeight(trackedFields) && tracksReps(trackedFields)) {
    push(stats.best1RM > 0, 'best1rm', `${stats.best1RM} ${weightUnit}`)
    push(stats.maxWeight > 0, 'maxWeight', `${stats.maxWeight} ${weightUnit}`)
  } else if (tracksReps(trackedFields)) {
    push(stats.maxReps > 0, 'maxReps', stats.maxReps)
    push(stats.avgReps > 0, 'avgReps', stats.avgReps)
  } else if (tracksTime(trackedFields)) {
    push(stats.maxTime > 0, 'maxTime', formatSecondsToMMSS(stats.maxTime))
    push(stats.avgTime > 0, 'avgTime', formatSecondsToMMSS(stats.avgTime))
  } else if (tracksDistance(trackedFields)) {
    push(stats.maxDistance > 0, 'maxDistance', `${stats.maxDistance} ${distanceUnit}`)
    push(stats.avgDistance > 0, 'avgDistance', `${stats.avgDistance} ${distanceUnit}`)
  } else if (tracksPace(trackedFields)) {
    push(stats.bestPace > 0, 'bestPace', `${formatSecondsToMMSS(stats.bestPace)}/${distanceUnit}`)
    push(stats.avgPace > 0, 'avgPace', `${formatSecondsToMMSS(stats.avgPace)}/${distanceUnit}`)
  } else if (tracksWeight(trackedFields)) {
    push(stats.maxWeight > 0, 'maxWeight', `${stats.maxWeight} ${weightUnit}`)
  } else if (tracksLevel(trackedFields)) {
    push(stats.maxLevel > 0, 'maxLevel', stats.maxLevel)
    push(stats.avgLevel > 0, 'avgLevel', stats.avgLevel)
  } else {
    push(stats.maxCalories > 0, 'maxCalories', `${stats.maxCalories} kcal`)
    push(stats.avgCalories > 0, 'avgCalories', `${stats.avgCalories} kcal`)
  }

  return cards
}

/**
 * Calcula estadísticas de progresión de un ejercicio a partir de su historial.
 *
 * Ramas EXCLUYENTES por prioridad: resume el ejercicio por su métrica principal, no por todas a la
 * vez (peso × tiempo se resume por tiempo, no por peso y tiempo). ⚠️ El orden tiene que coincidir
 * con el de `getExerciseStatCards`, que es quien pinta lo que aquí se calcula.
 *
 * Las cuatro últimas ramas (ritmo, peso solo, nivel, calorías) cubren combinaciones que el enum
 * anterior no permitía y que con la selección libre de campos sí existen; sin ellas, esos
 * ejercicios se quedaban sin resumen ninguno.
 * @param {Array} sessions - Array de sesiones con sets (filas de completed_sets, snake_case)
 * @param {string[]} trackedFields - campos del ejercicio
 * @returns {object|null} solo las claves de la rama que aplica; el resto a 0
 */
export function calculateExerciseStats(sessions, trackedFields) {
  if (!sessions || sessions.length === 0) return null

  const allSets = sessions.flatMap(s => s.sets)
  if (allSets.length === 0) return null

  const stats = {
    best1RM: 0, maxWeight: 0, maxReps: 0, avgReps: 0, totalVolume: 0,
    maxTime: 0, avgTime: 0, maxDistance: 0, avgDistance: 0,
    maxLevel: 0, avgLevel: 0, maxCalories: 0, avgCalories: 0, bestPace: 0, avgPace: 0,
    sessionCount: sessions.length,
  }

  // Valores > 0 de una columna de completed_sets. El 0 se descarta a propósito: en estas columnas
  // significa "no registrado", así que arrastraría las medias hacia abajo.
  const valuesOf = (column) => allSets.map(set => set[column] || 0).filter(v => v > 0)
  const avg = (values, decimals = 0) => {
    const factor = 10 ** decimals
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length * factor) / factor
  }
  const fill = (column, maxKey, avgKey, decimals = 0) => {
    const values = valuesOf(column)
    if (values.length === 0) return
    stats[maxKey] = Math.max(...values)
    if (avgKey) stats[avgKey] = avg(values, decimals)
  }

  if (tracksWeight(trackedFields) && tracksReps(trackedFields)) {
    stats.best1RM = getBest1RMFromSets(allSets)
    stats.maxWeight = Math.max(...allSets.map(set => set.weight || 0))
    stats.maxReps = Math.max(...allSets.map(set => set.reps_completed || 0))
    stats.totalVolume = calculateTotalVolume(allSets)
  } else if (tracksReps(trackedFields)) {
    // Sin filtrar el 0: aquí una serie a 0 reps sí es un dato (la media lo refleja).
    const reps = allSets.map(set => set.reps_completed || 0)
    stats.maxReps = Math.max(...reps)
    stats.avgReps = avg(reps)
  } else if (tracksTime(trackedFields)) {
    fill('time_seconds', 'maxTime', 'avgTime')
  } else if (tracksDistance(trackedFields)) {
    // `distance_meters`, el nombre de la columna: el historial pasa las filas de completed_sets sin
    // transformar (ver useExerciseHistorySummary). Antes leía `s.distance`, que no existe, así que
    // maxDistance/avgDistance salían siempre a 0 y sus tarjetas nunca se pintaban.
    fill('distance_meters', 'maxDistance', 'avgDistance', 1)
  } else if (tracksPace(trackedFields)) {
    // En ritmo MENOR es mejor (min/km): el "mejor" es el mínimo, no el máximo.
    const paces = valuesOf('pace_seconds')
    if (paces.length > 0) {
      stats.bestPace = Math.min(...paces)
      stats.avgPace = avg(paces)
    }
  } else if (tracksWeight(trackedFields)) {
    fill('weight', 'maxWeight', null, 1)
  } else if (tracksLevel(trackedFields)) {
    fill('level', 'maxLevel', 'avgLevel')
  } else {
    fill('calories_burned', 'maxCalories', 'avgCalories')
  }

  return stats
}


/**
 * Construye un mapa de PRs por exercise_id a partir de los datos de PRs de sesion.
 * @param {Array} sessionPRs
 * @returns {Record<string, Object>}
 */
export function buildPRsByExerciseMap(sessionPRs) {
  if (!sessionPRs) return {}
  const map = {}
  for (const pr of sessionPRs) {
    // Un rep-PR (pr_rep_counts) puede existir sin disparar ningún is_pr_*
    // (ej. nuevo récord a N reps sin superar el bestWeight ni el best1RM).
    // Si no lo incluimos aquí, los slides de PR card se pierden al compartir
    // desde el histórico.
    const hasRepPR = Array.isArray(pr.pr_rep_counts) && pr.pr_rep_counts.length > 0
    const hasPR = pr.is_pr_weight || pr.is_pr_reps || pr.is_pr_1rm || pr.is_pr_volume ||
      pr.is_pr_time || pr.is_pr_distance || pr.is_pr_pace || hasRepPR
    if (hasPR) map[pr.exercise_id] = pr
  }
  return map
}
