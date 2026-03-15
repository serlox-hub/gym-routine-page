/**
 * Utilidades para tipos de medición de ejercicios
 */

/**
 * Constantes para tipos de medición
 */
export const MeasurementType = {
  WEIGHT_REPS: 'weight_reps',
  REPS_ONLY: 'reps_only',
  TIME: 'time',
  WEIGHT_TIME: 'weight_time',
  DISTANCE: 'distance',
  WEIGHT_DISTANCE: 'weight_distance',
  CALORIES: 'calories',
  LEVEL_TIME: 'level_time',
  LEVEL_DISTANCE: 'level_distance',
  LEVEL_CALORIES: 'level_calories',
  DISTANCE_TIME: 'distance_time',
  DISTANCE_PACE: 'distance_pace',
}

/**
 * Tipos de medición válidos
 */
export const MEASUREMENT_TYPES = Object.values(MeasurementType)

/**
 * Opciones de tipos de medición para formularios
 */
export const MEASUREMENT_TYPE_OPTIONS = [
  { value: MeasurementType.WEIGHT_REPS, label: 'Peso × Reps' },
  { value: MeasurementType.REPS_ONLY, label: 'Solo reps' },
  { value: MeasurementType.TIME, label: 'Tiempo' },
  { value: MeasurementType.WEIGHT_TIME, label: 'Peso × Tiempo' },
  { value: MeasurementType.DISTANCE, label: 'Distancia' },
  { value: MeasurementType.WEIGHT_DISTANCE, label: 'Peso × Distancia' },
  { value: MeasurementType.CALORIES, label: 'Calorías' },
  { value: MeasurementType.LEVEL_TIME, label: 'Nivel × Tiempo' },
  { value: MeasurementType.LEVEL_DISTANCE, label: 'Nivel × Distancia' },
  { value: MeasurementType.LEVEL_CALORIES, label: 'Nivel × Calorías' },
  { value: MeasurementType.DISTANCE_TIME, label: 'Distancia × Tiempo' },
  { value: MeasurementType.DISTANCE_PACE, label: 'Distancia × Ritmo' },
]

/**
 * Tipos de medición que usan peso (obligatorio)
 */
export const WEIGHT_MEASUREMENT_TYPES = [
  MeasurementType.WEIGHT_REPS,
  MeasurementType.WEIGHT_TIME,
  MeasurementType.WEIGHT_DISTANCE,
]

/**
 * Tipos de medición que usan repeticiones
 */
export const REPS_MEASUREMENT_TYPES = [
  MeasurementType.WEIGHT_REPS,
  MeasurementType.REPS_ONLY,
]

/**
 * Tipos de medición que usan tiempo
 */
export const TIME_MEASUREMENT_TYPES = [
  MeasurementType.TIME,
  MeasurementType.WEIGHT_TIME,
  MeasurementType.LEVEL_TIME,
  MeasurementType.DISTANCE_TIME,
]

/**
 * Tipos de medición que usan distancia
 */
export const DISTANCE_MEASUREMENT_TYPES = [
  MeasurementType.DISTANCE,
  MeasurementType.WEIGHT_DISTANCE,
  MeasurementType.LEVEL_DISTANCE,
  MeasurementType.DISTANCE_TIME,
  MeasurementType.DISTANCE_PACE,
]

export function measurementTypeUsesTime(measurementType) {
  return TIME_MEASUREMENT_TYPES.includes(measurementType)
}

export function measurementTypeUsesDistance(measurementType) {
  return DISTANCE_MEASUREMENT_TYPES.includes(measurementType)
}

/**
 * Tipos de medición que usan nivel (resistencia/inclinación)
 */
export const LEVEL_MEASUREMENT_TYPES = [
  MeasurementType.LEVEL_TIME,
  MeasurementType.LEVEL_DISTANCE,
  MeasurementType.LEVEL_CALORIES,
]

/**
 * Verifica si un tipo de medición usa repeticiones
 * @param {string} measurementType - Tipo de medición
 * @returns {boolean}
 */
export function measurementTypeUsesReps(measurementType) {
  return REPS_MEASUREMENT_TYPES.includes(measurementType)
}

/**
 * Verifica si un tipo de medición usa nivel
 * @param {string} measurementType - Tipo de medición
 * @returns {boolean}
 */
export function measurementTypeUsesLevel(measurementType) {
  return LEVEL_MEASUREMENT_TYPES.includes(measurementType)
}

/**
 * Obtiene la etiqueta del selector de esfuerzo según el tipo de medición
 * @param {string} measurementType - Tipo de medición
 * @returns {string}
 */
export function getEffortLabel(measurementType) {
  return measurementTypeUsesReps(measurementType) ? 'RIR' : 'Esfuerzo'
}

/**
 * Verifica si un tipo de medición es válido
 * @param {string} type - Tipo de medición
 * @returns {boolean}
 */
export function isValidMeasurementType(type) {
  return MEASUREMENT_TYPES.includes(type)
}

/**
 * Verifica si un tipo de medición usa peso
 * @param {string} measurementType - Tipo de medición
 * @returns {boolean}
 */
export function measurementTypeUsesWeight(measurementType) {
  return WEIGHT_MEASUREMENT_TYPES.includes(measurementType)
}

/**
 * Obtiene las repeticiones por defecto según el tipo de medición
 * @param {string} measurementType - Tipo de medición
 * @returns {string}
 */
export function getDefaultReps(measurementType) {
  switch (measurementType) {
    case MeasurementType.WEIGHT_REPS:
    case MeasurementType.REPS_ONLY:
      return '8-12'
    case MeasurementType.TIME:
    case MeasurementType.WEIGHT_TIME:
    case MeasurementType.LEVEL_TIME:
      return '30s'
    case MeasurementType.DISTANCE:
    case MeasurementType.WEIGHT_DISTANCE:
    case MeasurementType.LEVEL_DISTANCE:
      return '40m'
    case MeasurementType.CALORIES:
    case MeasurementType.LEVEL_CALORIES:
      return '100kcal'
    case MeasurementType.DISTANCE_TIME:
    case MeasurementType.DISTANCE_PACE:
      return '5km'
    default:
      return '8-12'
  }
}

export function getRepsLabel(measurementType) {
  switch (measurementType) {
    case MeasurementType.WEIGHT_REPS:
    case MeasurementType.REPS_ONLY:
      return 'Repeticiones'
    case MeasurementType.TIME:
    case MeasurementType.WEIGHT_TIME:
    case MeasurementType.LEVEL_TIME:
      return 'Tiempo'
    case MeasurementType.DISTANCE:
    case MeasurementType.WEIGHT_DISTANCE:
    case MeasurementType.LEVEL_DISTANCE:
      return 'Distancia'
    case MeasurementType.CALORIES:
    case MeasurementType.LEVEL_CALORIES:
      return 'Calorías'
    case MeasurementType.DISTANCE_TIME:
    case MeasurementType.DISTANCE_PACE:
      return 'Distancia'
    default:
      return 'Repeticiones'
  }
}

export function getRepsPlaceholder(measurementType) {
  switch (measurementType) {
    case MeasurementType.WEIGHT_REPS:
    case MeasurementType.REPS_ONLY:
      return 'Ej: 8-12'
    case MeasurementType.TIME:
    case MeasurementType.WEIGHT_TIME:
    case MeasurementType.LEVEL_TIME:
      return 'Ej: 30s, 1min'
    case MeasurementType.DISTANCE:
    case MeasurementType.WEIGHT_DISTANCE:
    case MeasurementType.LEVEL_DISTANCE:
      return 'Ej: 40m'
    case MeasurementType.CALORIES:
    case MeasurementType.LEVEL_CALORIES:
      return 'Ej: 100kcal'
    case MeasurementType.DISTANCE_TIME:
    case MeasurementType.DISTANCE_PACE:
      return 'Ej: 5km'
    default:
      return 'Ej: 8-12'
  }
}
