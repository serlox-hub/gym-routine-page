/**
 * Utilidades para manejo de series (sets)
 */

/**
 * Crea una clave única para identificar una serie
 * @param {string|number} routineExerciseId - ID del ejercicio de rutina
 * @param {number} setNumber - Número de serie
 * @returns {string}
 */
export function createSetKey(routineExerciseId, setNumber) {
  return `${routineExerciseId}-${setNumber}`
}

/**
 * Verifica si un ID corresponde a un ejercicio extra (añadido durante la sesión)
 * @param {string|number} routineExerciseId - ID del ejercicio
 * @returns {boolean}
 */
export function isExtraExercise(routineExerciseId) {
  return typeof routineExerciseId === 'string' && routineExerciseId.startsWith('extra-')
}

/**
 * Genera un ID único para un ejercicio extra
 * @returns {string}
 */
export function generateExtraExerciseId() {
  return `extra-${Date.now()}`
}

/**
 * Valida si los datos de una serie son válidos según el tipo de medición
 * @param {string} measurementType - Tipo de medición
 * @param {{weight?: string|number, reps?: string|number, time?: string|number, distance?: string|number}} data - Datos de la serie
 * @returns {boolean}
 */
export function isSetDataValid(measurementType, { weight, reps, time, distance }) {
  switch (measurementType) {
    case 'weight_reps':
      return weight !== '' && weight !== undefined && reps !== '' && reps !== undefined
    case 'reps_only':
      return reps !== '' && reps !== undefined
    case 'time':
      return time !== '' && time !== undefined
    case 'distance':
      return distance !== '' && distance !== undefined
    default:
      return false
  }
}

/**
 * Construye el objeto de datos para completar una serie
 * @param {string} measurementType - Tipo de medición
 * @param {{weight?: string, reps?: string, time?: string, distance?: string}} formData - Datos del formulario
 * @param {{routineExerciseId: string|number, exerciseId: number, setNumber: number, weightUnit?: string, rirActual?: number, notes?: string}} info - Información adicional
 * @returns {Object} Datos para guardar la serie
 */
export function buildCompletedSetData(measurementType, formData, info) {
  const { routineExerciseId, exerciseId, setNumber, weightUnit = 'kg', rirActual, notes } = info
  const { weight, reps, time, distance } = formData

  const data = {
    routineExerciseId,
    exerciseId,
    setNumber,
    rirActual,
    notes,
  }

  switch (measurementType) {
    case 'weight_reps':
      data.weight = parseFloat(weight)
      data.weightUnit = weightUnit
      data.repsCompleted = parseInt(reps)
      break
    case 'reps_only':
      data.repsCompleted = parseInt(reps)
      break
    case 'time':
      data.timeSeconds = parseInt(time)
      break
    case 'distance':
      data.distanceMeters = parseFloat(distance)
      if (weight) {
        data.weight = parseFloat(weight)
        data.weightUnit = weightUnit
      }
      break
  }

  return data
}

/**
 * Formatea el valor de una serie para mostrar (ej: "80kg × 12 reps")
 * @param {{weight?: number, weight_unit?: string, reps_completed?: number, time_seconds?: number, distance_meters?: number}} set - Datos de la serie
 * @returns {string}
 */
export function formatSetValue(set) {
  const parts = []
  if (set.weight) {
    parts.push(`${set.weight}${set.weight_unit || 'kg'}`)
  }
  if (set.reps_completed) {
    parts.push(`${set.reps_completed} reps`)
  }
  if (set.time_seconds) {
    parts.push(`${set.time_seconds}s`)
  }
  if (set.distance_meters) {
    parts.push(`${set.distance_meters}m`)
  }
  return parts.join(' × ')
}

/**
 * Formatea el valor de una serie según el tipo de medición (para historial)
 * @param {{weight?: number, weightUnit?: string, reps?: number, timeSeconds?: number, distanceMeters?: number}} set - Datos de la serie
 * @param {string} measurementType - Tipo de medición
 * @returns {string}
 */
export function formatSetValueByType(set, measurementType) {
  switch (measurementType) {
    case 'weight_reps':
      return `${set.weight}${set.weightUnit || 'kg'} × ${set.reps}`
    case 'reps_only':
      return `${set.reps} reps`
    case 'time':
      return `${set.timeSeconds}s`
    case 'distance':
      return set.weight
        ? `${set.weight}${set.weightUnit || 'kg'} × ${set.distanceMeters}m`
        : `${set.distanceMeters}m`
    default:
      return set.weight ? `${set.weight}${set.weightUnit || 'kg'} × ${set.reps}` : `${set.reps}`
  }
}

/**
 * Filtra y ordena series para un ejercicio específico
 * @param {Object} completedSets - Mapa de series completadas
 * @param {string|number} routineExerciseId - ID del ejercicio
 * @returns {Array} Series filtradas y ordenadas por número
 */
export function getSetsForExercise(completedSets, routineExerciseId) {
  return Object.values(completedSets)
    .filter(set => set.routineExerciseId === routineExerciseId)
    .sort((a, b) => a.setNumber - b.setNumber)
}

/**
 * Construye la configuración para un ejercicio extra
 * @param {string} extraId - ID generado para el ejercicio extra
 * @param {Object} exercise - Datos del ejercicio
 * @param {{series?: number, reps?: string, rir?: number, rest_seconds?: number}} config - Configuración
 * @returns {Object}
 */
export function buildExtraExerciseConfig(extraId, exercise, config) {
  return {
    id: extraId,
    exercise,
    series: config.series || 3,
    reps: config.reps || '10',
    rir: config.rir ?? 2,
    rest_seconds: config.rest_seconds || 90,
    measurement_type: exercise.measurement_type || 'weight_reps',
  }
}
