import { t } from '../i18n/index.js'

// App
export const APP_NAME = 'Diario Gym'
export const APP_URL = 'www.diariogym.com'

// Summary Card
export const SUMMARY_MAX_EXERCISES = 8

// Sesión activa: debounce para persistir ediciones de series (peso/reps/…) mientras
// se teclea, evitando spam de escrituras a store/DB/AsyncStorage. Compartido web+native.
export const SET_EDIT_DEBOUNCE_MS = 600

// Block names (DB identifiers — always Spanish in the database)
export const BLOCK_NAMES = {
  WARMUP: 'Calentamiento',
  MAIN: 'Principal',
  ADDED: 'Añadido',
}

// RIR (Reps In Reserve) Options
export const RIR_OPTIONS = [
  { value: -1, label: 'F' },
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3+' },
]

export function getRirDescription(value) {
  return t(`data:rir.${value}`)
}

export function getRirOptions() {
  return RIR_OPTIONS.map(opt => ({
    ...opt,
    description: t(`data:rir.${opt.value}`),
  }))
}

// RIR Labels lookup (for display)
export const RIR_LABELS = RIR_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = { label: opt.label, get description() { return t(`data:rir.${opt.value}`) } }
  return acc
}, {})

// RPE (Rate of Perceived Exertion) options for non-reps exercises
// Stored as numeric value 1-5, displayed with descriptive label
export const RPE_OPTIONS = [
  { value: 1, get label() { return t('data:rpe.1') } },
  { value: 2, get label() { return t('data:rpe.2') } },
  { value: 3, get label() { return t('data:rpe.3') } },
  { value: 4, get label() { return t('data:rpe.4') } },
  { value: 5, get label() { return t('data:rpe.5') } },
]

// RPE Labels lookup (label is the descriptive translation, no separate description)
export const RPE_LABELS = RPE_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = { get label() { return t(`data:rpe.${opt.value}`) }, description: '' }
  return acc
}, {})

// Query Keys
export const QUERY_KEYS = {
  ROUTINES: 'routines',
  ROUTINE: 'routine',
  ROUTINE_DAYS: 'routine-days',
  ROUTINE_DAY: 'routine-day',
  ROUTINE_BLOCKS: 'routine-blocks',
  ROUTINE_ALL_EXERCISES: 'routine-all-exercises',
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
  BODY_MEASUREMENT_LATEST: 'body-measurement-latest',
  USER_SETTINGS: 'user-settings',
  USER_PREFERENCES: 'user-preferences',
  ADMIN_USERS: 'admin-users',
  ADMIN_FEEDBACK: 'admin-feedback',
  EXERCISE_USAGE_COUNTS: 'exercise-usage-counts',
  EXERCISE_USAGE_DETAIL: 'exercise-usage-detail',
  TRAINING_GOAL_SESSIONS: 'training-goal-sessions',
  MUSCLE_GROUPS: 'muscle-groups',
  EQUIPMENT_TYPES: 'equipment-types',
  LAST_SESSION_FOR_ROUTINE: 'last-session-for-routine',
  WEEKLY_SESSION_STATS: 'weekly-session-stats',
  WEEKLY_PR_COUNT: 'weekly-pr-count',
  GYMS: 'gyms',
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
export function getSensationLabel(value) {
  return t(`data:sensation.${value}`)
}

export function getSensationLabels() {
  return {
    1: t('data:sensation.1'),
    2: t('data:sensation.2'),
    3: t('data:sensation.3'),
    4: t('data:sensation.4'),
    5: t('data:sensation.5'),
  }
}

// Backwards-compatible proxy — keys resolve at access time
export const SENSATION_LABELS = new Proxy({}, {
  get(_, key) { return t(`data:sensation.${key}`) },
  ownKeys() { return ['1', '2', '3', '4', '5'] },
  getOwnPropertyDescriptor() { return { configurable: true, enumerable: true } },
})

export const SENSATION_COLORS = {
  1: '#f85149',
  2: '#d29922',
  3: '#8b949e',
  4: '#3fb950',
  5: '#58a6ff',
}

export function getSensationColor(value) {
  return SENSATION_COLORS[value] || '#8b949e'
}

// Set Types
export const SET_TYPES = {
  NORMAL: 'normal',
  DROPSET: 'dropset',
}

export function getSetTypeLabel(type) {
  return t(`data:setTypes.${type}`)
}

export function getSetTypeLabels() {
  return {
    normal: t('data:setTypes.normal'),
    dropset: t('data:setTypes.dropset'),
  }
}

// Backwards-compatible proxy
export const SET_TYPE_LABELS = new Proxy({}, {
  get(_, key) { return t(`data:setTypes.${key}`) },
  ownKeys() { return ['normal', 'dropset'] },
  getOwnPropertyDescriptor() { return { configurable: true, enumerable: true } },
})

// Muscle Group Colors (keys are DB names — always Spanish)
export const MUSCLE_GROUP_COLORS = {
  'Pecho': '#f85149',
  'Espalda': '#58a6ff',
  'Hombros': '#a371f7',
  'Bíceps': '#d29922',
  'Tríceps': '#39d2c0',
  'Cuádriceps': '#226f2d',
  'Isquiotibiales': '#f0883e',
  'Pantorrillas': '#c69178',
  'Abdominales': '#abe79f',
  'Glúteos': '#db61a2',
  'Antebrazo': '#8b949e',
  'Cardio': '#dd23d9',
  'Movilidad': '#dddddd',
  'Cuerpo Completo': '#1d3bdf',
}

export function getMuscleGroupColor(name) {
  return MUSCLE_GROUP_COLORS[name] || '#8b949e'
}

export function translateBlockName(dbName) {
  return t(`data:blockNames.${dbName}`, { defaultValue: dbName })
}
