/**
 * Utilidades para tipos de medición de ejercicios
 */

/**
 * Tipos de medición válidos
 */
export const MEASUREMENT_TYPES = [
  'weight_reps',
  'reps_only',
  'time',
  'distance',
]

/**
 * Tipos de medición que usan peso
 */
export const WEIGHT_MEASUREMENT_TYPES = ['weight_reps', 'distance']

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
    case 'weight_reps':
    case 'reps_only':
      return '8-12'
    case 'time':
      return '30s'
    case 'distance':
      return '40m'
    default:
      return '8-12'
  }
}

export function getRepsLabel(measurementType) {
  switch (measurementType) {
    case 'weight_reps':
    case 'reps_only':
      return 'Repeticiones'
    case 'time':
      return 'Tiempo'
    case 'distance':
      return 'Distancia'
    default:
      return 'Repeticiones'
  }
}

export function getRepsPlaceholder(measurementType) {
  switch (measurementType) {
    case 'weight_reps':
    case 'reps_only':
      return 'Ej: 8-12'
    case 'time':
      return 'Ej: 30s, 1min'
    case 'distance':
      return 'Ej: 40m'
    default:
      return 'Ej: 8-12'
  }
}
