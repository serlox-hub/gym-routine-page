/**
 * Utilidades para manejo de series (sets)
 */

import { MeasurementType } from './measurementTypes.js'
import { parseDecimal } from './numberUtils.js'

/**
 * Formatea un número con coma decimal (formato español)
 */
function formatNumber(value) {
  if (value == null) return ''
  return Number(value).toLocaleString('es-ES')
}

/**
 * Formatea segundos como mm:ss
 */
export function formatSecondsAsMMSS(totalSeconds) {
  if (!totalSeconds && totalSeconds !== 0) return ''
  const s = Math.round(Number(totalSeconds))
  const min = Math.floor(s / 60)
  const sec = s % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

/**
 * Formatea segundos según la unidad de tiempo del ejercicio
 */
export function formatTimeInUnit(seconds, timeUnit) {
  if (!seconds) return '0'
  if (timeUnit === 'min') return formatSecondsAsMMSS(seconds)
  return `${seconds}`
}

/**
 * Etiqueta de unidad de tiempo para display
 */
export function getTimeUnitLabel(timeUnit) {
  return timeUnit === 'min' ? 'min' : 's'
}

/**
 * Convierte un valor de distancia a metros según la unidad
 */
export function distanceToMeters(value, distanceUnit) {
  const num = parseDecimal(value)
  if (isNaN(num)) return 0
  return distanceUnit === 'km' ? Math.round(num * 1000) : num
}

/**
 * Convierte metros a la unidad indicada
 */
export function metersToDistanceUnit(meters, distanceUnit) {
  if (!meters) return 0
  return distanceUnit === 'km' ? +(meters / 1000).toFixed(3) : meters
}

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
export function isSetDataValid(measurementType, { weight, reps, time, distance, calories, level, pace }) {
  switch (measurementType) {
    case MeasurementType.WEIGHT_REPS:
      return weight !== '' && weight !== undefined && reps !== '' && reps !== undefined
    case MeasurementType.REPS_ONLY:
      return reps !== '' && reps !== undefined
    case MeasurementType.TIME:
      return time !== '' && time !== undefined
    case MeasurementType.WEIGHT_TIME:
      return weight !== '' && weight !== undefined && time !== '' && time !== undefined
    case MeasurementType.DISTANCE:
      return distance !== '' && distance !== undefined
    case MeasurementType.WEIGHT_DISTANCE:
      return weight !== '' && weight !== undefined && distance !== '' && distance !== undefined
    case MeasurementType.CALORIES:
      return calories !== '' && calories !== undefined
    case MeasurementType.LEVEL_TIME:
      return level !== '' && level !== undefined && time !== '' && time !== undefined
    case MeasurementType.LEVEL_DISTANCE:
      return level !== '' && level !== undefined && distance !== '' && distance !== undefined
    case MeasurementType.LEVEL_CALORIES:
      return level !== '' && level !== undefined && calories !== '' && calories !== undefined
    case MeasurementType.DISTANCE_TIME:
      return distance !== '' && distance !== undefined && time !== '' && time !== undefined
    case MeasurementType.DISTANCE_PACE:
      return distance !== '' && distance !== undefined && pace !== '' && pace !== undefined && pace > 0
    default:
      return false
  }
}

/**
 * Construye el objeto de datos para completar una serie
 * @param {string} measurementType - Tipo de medición
 * @param {{weight?: string, reps?: string, time?: string, distance?: string, calories?: string}} formData - Datos del formulario
 * @param {{routineExerciseId?: string|number, sessionExerciseId?: string|number, exerciseId: number, setNumber: number, weightUnit?: string, rirActual?: number, notes?: string, videoUrl?: string}} info - Información adicional
 * @returns {Object} Datos para guardar la serie
 */
export function buildCompletedSetData(measurementType, formData, info) {
  const { routineExerciseId, sessionExerciseId, exerciseId, setNumber, distanceUnit = 'm', rirActual, notes, videoUrl, setType } = info
  const { weight, reps, time, distance, calories, level, pace } = formData

  const data = {
    exerciseId,
    setNumber,
    rirActual,
    notes,
  }

  // Soportar ambos IDs para flexibilidad
  if (sessionExerciseId !== undefined) data.sessionExerciseId = sessionExerciseId
  if (routineExerciseId !== undefined) data.routineExerciseId = routineExerciseId
  if (videoUrl !== undefined) data.videoUrl = videoUrl
  if (setType && setType !== 'normal') data.setType = setType

  switch (measurementType) {
    case MeasurementType.WEIGHT_REPS:
      data.weight = parseDecimal(weight)
      data.repsCompleted = parseInt(reps)
      break
    case MeasurementType.REPS_ONLY:
      data.repsCompleted = parseInt(reps)
      break
    case MeasurementType.TIME:
      data.timeSeconds = parseInt(time)
      break
    case MeasurementType.WEIGHT_TIME:
      data.weight = parseDecimal(weight)
      data.timeSeconds = parseInt(time)
      break
    case MeasurementType.DISTANCE:
      data.distanceMeters = distanceToMeters(distance, distanceUnit)
      break
    case MeasurementType.WEIGHT_DISTANCE:
      data.weight = parseDecimal(weight)
      data.distanceMeters = distanceToMeters(distance, distanceUnit)
      break
    case MeasurementType.CALORIES:
      data.caloriesBurned = parseInt(calories)
      break
    case MeasurementType.LEVEL_TIME:
      data.level = parseInt(level)
      data.timeSeconds = parseInt(time)
      break
    case MeasurementType.LEVEL_DISTANCE:
      data.level = parseInt(level)
      data.distanceMeters = distanceToMeters(distance, distanceUnit)
      break
    case MeasurementType.LEVEL_CALORIES:
      data.level = parseInt(level)
      data.caloriesBurned = parseInt(calories)
      break
    case MeasurementType.DISTANCE_TIME:
      data.distanceMeters = distanceToMeters(distance, distanceUnit)
      data.timeSeconds = parseInt(time)
      break
    case MeasurementType.DISTANCE_PACE:
      data.distanceMeters = distanceToMeters(distance, distanceUnit)
      data.paceSeconds = parseInt(pace)
      break
  }

  return data
}

/**
 * Formatea el valor de una serie para mostrar (ej: "80kg × 12 reps")
 * @param {{weight?: number, weight_unit?: string, reps_completed?: number, time_seconds?: number, distance_meters?: number}} set - Datos de la serie
 * @returns {string}
 */
export function formatSetValue(set, { timeUnit = 's', distanceUnit = 'm' } = {}) {
  const parts = []
  if (set.level) {
    parts.push(`Nv${set.level}`)
  }
  if (set.weight) {
    parts.push(`${formatNumber(set.weight)}${set.weight_unit || 'kg'}`)
  }
  if (set.reps_completed) {
    parts.push(`${set.reps_completed} reps`)
  }
  if (set.time_seconds) {
    parts.push(timeUnit === 'min' ? formatSecondsAsMMSS(set.time_seconds) : `${set.time_seconds}s`)
  }
  if (set.distance_meters) {
    const val = metersToDistanceUnit(set.distance_meters, distanceUnit)
    parts.push(`${formatNumber(val)}${distanceUnit}`)
  }
  if (set.pace_seconds) {
    parts.push(`${formatSecondsAsMMSS(set.pace_seconds)}/${distanceUnit}`)
  }
  if (set.calories_burned) {
    parts.push(`${set.calories_burned}kcal`)
  }
  return parts.join(' × ')
}

/**
 * Formatea el valor de una serie según el tipo de medición (para historial)
 * @param {{weight?: number, weightUnit?: string, reps?: number, timeSeconds?: number, distanceMeters?: number}} set - Datos de la serie
 * @param {string} measurementType - Tipo de medición
 * @returns {string}
 */
export function formatSetValueByType(set, measurementType, { timeUnit = 's', distanceUnit = 'm' } = {}) {
  const wUnit = set.weightUnit || 'kg'
  const fmtTime = (s) => timeUnit === 'min' ? formatSecondsAsMMSS(s) : `${s}s`
  const dVal = set.distanceMeters ? metersToDistanceUnit(set.distanceMeters, distanceUnit) : 0
  switch (measurementType) {
    case MeasurementType.WEIGHT_REPS:
      return `${formatNumber(set.weight)}${wUnit} × ${set.reps}`
    case MeasurementType.REPS_ONLY:
      return `${set.reps} reps`
    case MeasurementType.TIME:
      return fmtTime(set.timeSeconds)
    case MeasurementType.WEIGHT_TIME:
      return `${formatNumber(set.weight)}${wUnit} × ${fmtTime(set.timeSeconds)}`
    case MeasurementType.DISTANCE:
      return `${formatNumber(dVal)}${distanceUnit}`
    case MeasurementType.WEIGHT_DISTANCE:
      return `${formatNumber(set.weight)}${wUnit} × ${formatNumber(dVal)}${distanceUnit}`
    case MeasurementType.CALORIES:
      return `${set.caloriesBurned}kcal`
    case MeasurementType.LEVEL_TIME:
      return `Nv${set.level} × ${fmtTime(set.timeSeconds)}`
    case MeasurementType.LEVEL_DISTANCE:
      return `Nv${set.level} × ${formatNumber(dVal)}${distanceUnit}`
    case MeasurementType.LEVEL_CALORIES:
      return `Nv${set.level} × ${set.caloriesBurned}kcal`
    case MeasurementType.DISTANCE_TIME:
      return `${formatNumber(dVal)}${distanceUnit} × ${fmtTime(set.timeSeconds)}`
    case MeasurementType.DISTANCE_PACE:
      return `${formatNumber(dVal)}${distanceUnit} @ ${formatSecondsAsMMSS(set.paceSeconds)}/${distanceUnit}`
    default:
      return set.weight ? `${formatNumber(set.weight)}${wUnit} × ${set.reps}` : `${set.reps}`
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
    measurement_type: exercise.measurement_type || MeasurementType.WEIGHT_REPS,
  }
}
