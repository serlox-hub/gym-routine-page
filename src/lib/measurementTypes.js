/**
 * Utilidades para tipos de medición de ejercicios
 */

export function getDefaultReps(measurementType) {
  switch (measurementType) {
    case 'weight_reps':
    case 'reps_only':
      return '8-12'
    case 'reps_per_side':
      return '10/lado'
    case 'time':
      return '30s'
    case 'time_per_side':
      return '30s/lado'
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
    case 'reps_per_side':
      return 'Reps por lado'
    case 'time':
      return 'Tiempo'
    case 'time_per_side':
      return 'Tiempo por lado'
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
    case 'reps_per_side':
      return 'Ej: 10/lado'
    case 'time':
      return 'Ej: 30s, 1min'
    case 'time_per_side':
      return 'Ej: 30s/lado'
    case 'distance':
      return 'Ej: 40m'
    default:
      return 'Ej: 8-12'
  }
}
