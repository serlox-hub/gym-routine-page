/**
 * Utilidades para cálculos de entrenamiento
 */

import { MeasurementType } from './measurementTypes.js'

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

/**
 * Obtiene el mejor valor de un conjunto de series según el tipo de medición
 * @param {Array} sets - Array de series
 * @param {string} measurementType - Tipo de medición
 * @returns {{value: number, unit: string}}
 */
export function getBestValueFromSets(sets, measurementType) {
  if (!sets || sets.length === 0) return { value: 0, unit: '' }

  let bestValue = 0
  let unit = ''

  sets.forEach(set => {
    if (measurementType === MeasurementType.WEIGHT_REPS || measurementType === MeasurementType.WEIGHT_DISTANCE || measurementType === MeasurementType.WEIGHT_TIME) {
      if (set.weight && set.weight > bestValue) {
        bestValue = set.weight
        unit = set.weight_unit || 'kg'
      }
    } else if (measurementType === MeasurementType.TIME) {
      if (set.time_seconds && set.time_seconds > bestValue) {
        bestValue = set.time_seconds
        unit = 's'
      }
    } else if (measurementType === MeasurementType.DISTANCE) {
      if (set.distance_meters && set.distance_meters > bestValue) {
        bestValue = set.distance_meters
        unit = 'm'
      }
    } else if (measurementType === MeasurementType.CALORIES) {
      if (set.calories_burned && set.calories_burned > bestValue) {
        bestValue = set.calories_burned
        unit = 'kcal'
      }
    } else {
      const reps = set.reps_completed || set.reps || 0
      if (reps > bestValue) {
        bestValue = reps
        unit = 'reps'
      }
    }
  })

  return { value: bestValue, unit }
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
 * @param {string} measurementType - Tipo de medición
 * @returns {Array<{date: string, best: number, volume: number, e1rm: number, unit: string}>}
 */
export function transformSessionsToChartData(sessions, measurementType) {
  if (!sessions || sessions.length === 0) return []

  const sortedSessions = [...sessions].reverse()

  return sortedSessions.map(session => {
    const date = new Date(session.date)
    const dateLabel = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

    const { value: bestValue, unit } = getBestValueFromSets(session.sets, measurementType)
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
 * Calcula el progreso de series completadas en una sesión (excluye calentamiento)
 * @param {Array} flatExercises - Lista plana de ejercicios con sessionExerciseId y series
 * @param {Object} completedSets - Mapa de series completadas (key: sessionExerciseId-setNumber)
 * @param {Object} exerciseSetCounts - Mapa de conteo de series por ejercicio (key: sessionExerciseId)
 * @returns {{completed: number, total: number}}
 */
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
 * Calcula estadísticas de progresión para un ejercicio
 * @param {Array} sessions - Array de sesiones con sets
 * @param {string} measurementType - Tipo de medición
 * @returns {{best1RM: number, maxWeight: number, maxReps: number, totalVolume: number, sessionCount: number}|null}
 */
export function calculateExerciseStats(sessions, measurementType) {
  if (!sessions || sessions.length === 0) return null

  const allSets = sessions.flatMap(s => s.sets)

  let best1RM = 0
  let maxWeight = 0
  let maxReps = 0
  let totalVolume = 0

  if (measurementType === MeasurementType.WEIGHT_REPS) {
    best1RM = getBest1RMFromSets(allSets)
    maxWeight = Math.max(...allSets.map(s => s.weight || 0))
    maxReps = Math.max(...allSets.map(s => s.reps_completed || 0))
    totalVolume = calculateTotalVolume(allSets)
  } else if (measurementType === MeasurementType.REPS_ONLY) {
    maxReps = Math.max(...allSets.map(s => s.reps_completed || 0))
  }

  return {
    best1RM,
    maxWeight,
    maxReps,
    totalVolume,
    sessionCount: sessions.length,
  }
}
