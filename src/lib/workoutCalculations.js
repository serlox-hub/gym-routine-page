/**
 * Utilidades para cálculos de entrenamiento
 */

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
    if (measurementType === 'weight_reps' || measurementType === 'distance') {
      if (set.weight && set.weight > bestValue) {
        bestValue = set.weight
        unit = set.weight_unit || 'kg'
      }
    } else if (measurementType === 'time' || measurementType === 'time_per_side') {
      if (set.time_seconds && set.time_seconds > bestValue) {
        bestValue = set.time_seconds
        unit = 's'
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
