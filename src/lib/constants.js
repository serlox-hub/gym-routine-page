// RIR (Reps In Reserve) Options
export const RIR_OPTIONS = [
  { value: -1, label: 'F', description: 'Fallo' },
  { value: 0, label: '0', description: 'Última rep' },
  { value: 1, label: '1', description: 'Muy cerca' },
  { value: 2, label: '2', description: 'Controlado' },
  { value: 3, label: '3+', description: 'Cómodo' },
]

// RIR Labels lookup (for display)
export const RIR_LABELS = RIR_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = { label: opt.label, description: opt.description }
  return acc
}, {})

// Query Keys
export const QUERY_KEYS = {
  ROUTINES: 'routines',
  ROUTINE: 'routine',
  ROUTINE_DAYS: 'routine-days',
  ROUTINE_DAY: 'routine-day',
  ROUTINE_BLOCKS: 'routine-blocks',
  EXERCISES: 'exercises',
  WORKOUT_SESSION: 'workout-session',
  SESSION_EXERCISES: 'session-exercises',
  COMPLETED_SETS: 'completed-sets',
  PREVIOUS_WORKOUT: 'previous-workout',
  WORKOUT_HISTORY: 'workout-history',
  SESSION_DETAIL: 'session-detail',
  EXERCISE_HISTORY: 'exercise-history',
  BODY_WEIGHT_HISTORY: 'body-weight-history',
  BODY_WEIGHT_LATEST: 'body-weight-latest',
  BODY_MEASUREMENT_HISTORY: 'body-measurement-history',
  BODY_MEASUREMENTS_LATEST: 'body-measurements-latest',
  USER_SETTINGS: 'user-settings',
  USER_PREFERENCES: 'user-preferences',
  ADMIN_USERS: 'admin-users',
}

// Timer
export const REST_TIME_DEFAULT = 90
export const REST_TIME_MIN = 30
export const REST_TIME_MAX = 300
export const REST_TIME_INCREMENT = 15

// Workout
export const RIR_MIN = 0
export const RIR_MAX = 5

// Session Status
export const SESSION_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
}

// Sensation Scale (1-5)
export const SENSATION_LABELS = {
  1: 'Muy mal',
  2: 'Mal',
  3: 'Normal',
  4: 'Bien',
  5: 'Muy bien',
}

export const SENSATION_COLORS = {
  1: '#f85149',
  2: '#d29922',
  3: '#8b949e',
  4: '#3fb950',
  5: '#58a6ff',
}

/**
 * Obtiene el color asociado a un valor de sensación
 * @param {number} value - Valor de sensación (1-5)
 * @returns {string} Color hex
 */
export function getSensationColor(value) {
  return SENSATION_COLORS[value] || '#8b949e'
}
