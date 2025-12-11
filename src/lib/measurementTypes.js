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
 * Verifica si un tipo de medición usa repeticiones
 * @param {string} measurementType - Tipo de medición
 * @returns {boolean}
 */
export function measurementTypeUsesReps(measurementType) {
  return REPS_MEASUREMENT_TYPES.includes(measurementType)
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
      return '30s'
    case MeasurementType.DISTANCE:
    case MeasurementType.WEIGHT_DISTANCE:
      return '40m'
    case MeasurementType.CALORIES:
      return '100kcal'
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
      return 'Tiempo'
    case MeasurementType.DISTANCE:
    case MeasurementType.WEIGHT_DISTANCE:
      return 'Distancia'
    case MeasurementType.CALORIES:
      return 'Calorías'
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
      return 'Ej: 30s, 1min'
    case MeasurementType.DISTANCE:
    case MeasurementType.WEIGHT_DISTANCE:
      return 'Ej: 40m'
    case MeasurementType.CALORIES:
      return 'Ej: 100kcal'
    default:
      return 'Ej: 8-12'
  }
}
