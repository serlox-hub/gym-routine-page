import { t } from '../i18n/index.js'

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

export const MEASUREMENT_TYPES = Object.values(MeasurementType)

export function getMeasurementTypeOptions() {
  return [
    { value: MeasurementType.WEIGHT_REPS, label: t('data:measurementTypes.weight_reps') },
    { value: MeasurementType.REPS_ONLY, label: t('data:measurementTypes.reps_only') },
    { value: MeasurementType.TIME, label: t('data:measurementTypes.time') },
    { value: MeasurementType.WEIGHT_TIME, label: t('data:measurementTypes.weight_time') },
    { value: MeasurementType.DISTANCE, label: t('data:measurementTypes.distance') },
    { value: MeasurementType.WEIGHT_DISTANCE, label: t('data:measurementTypes.weight_distance') },
    { value: MeasurementType.CALORIES, label: t('data:measurementTypes.calories') },
    { value: MeasurementType.LEVEL_TIME, label: t('data:measurementTypes.level_time') },
    { value: MeasurementType.LEVEL_DISTANCE, label: t('data:measurementTypes.level_distance') },
    { value: MeasurementType.LEVEL_CALORIES, label: t('data:measurementTypes.level_calories') },
    { value: MeasurementType.DISTANCE_TIME, label: t('data:measurementTypes.distance_time') },
    { value: MeasurementType.DISTANCE_PACE, label: t('data:measurementTypes.distance_pace') },
  ]
}

// Keep for backwards compatibility — consumers that import the constant directly
export const MEASUREMENT_TYPE_OPTIONS = [
  { value: MeasurementType.WEIGHT_REPS, get label() { return t('data:measurementTypes.weight_reps') } },
  { value: MeasurementType.REPS_ONLY, get label() { return t('data:measurementTypes.reps_only') } },
  { value: MeasurementType.TIME, get label() { return t('data:measurementTypes.time') } },
  { value: MeasurementType.WEIGHT_TIME, get label() { return t('data:measurementTypes.weight_time') } },
  { value: MeasurementType.DISTANCE, get label() { return t('data:measurementTypes.distance') } },
  { value: MeasurementType.WEIGHT_DISTANCE, get label() { return t('data:measurementTypes.weight_distance') } },
  { value: MeasurementType.CALORIES, get label() { return t('data:measurementTypes.calories') } },
  { value: MeasurementType.LEVEL_TIME, get label() { return t('data:measurementTypes.level_time') } },
  { value: MeasurementType.LEVEL_DISTANCE, get label() { return t('data:measurementTypes.level_distance') } },
  { value: MeasurementType.LEVEL_CALORIES, get label() { return t('data:measurementTypes.level_calories') } },
  { value: MeasurementType.DISTANCE_TIME, get label() { return t('data:measurementTypes.distance_time') } },
  { value: MeasurementType.DISTANCE_PACE, get label() { return t('data:measurementTypes.distance_pace') } },
]

export const WEIGHT_MEASUREMENT_TYPES = [
  MeasurementType.WEIGHT_REPS,
  MeasurementType.WEIGHT_TIME,
  MeasurementType.WEIGHT_DISTANCE,
]

export const REPS_MEASUREMENT_TYPES = [
  MeasurementType.WEIGHT_REPS,
  MeasurementType.REPS_ONLY,
]

export const TIME_MEASUREMENT_TYPES = [
  MeasurementType.TIME,
  MeasurementType.WEIGHT_TIME,
  MeasurementType.LEVEL_TIME,
  MeasurementType.DISTANCE_TIME,
]

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

export const LEVEL_MEASUREMENT_TYPES = [
  MeasurementType.LEVEL_TIME,
  MeasurementType.LEVEL_DISTANCE,
  MeasurementType.LEVEL_CALORIES,
]

export function measurementTypeUsesReps(measurementType) {
  return REPS_MEASUREMENT_TYPES.includes(measurementType)
}

export function measurementTypeUsesLevel(measurementType) {
  return LEVEL_MEASUREMENT_TYPES.includes(measurementType)
}

export function getEffortLabel(measurementType) {
  return measurementTypeUsesReps(measurementType)
    ? t('exercise:effort.rir')
    : t('exercise:effort.effort')
}

export function isValidMeasurementType(type) {
  return MEASUREMENT_TYPES.includes(type)
}

export function measurementTypeUsesWeight(measurementType) {
  return WEIGHT_MEASUREMENT_TYPES.includes(measurementType)
}

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
      return t('exercise:repsLabel.reps')
    case MeasurementType.TIME:
    case MeasurementType.WEIGHT_TIME:
    case MeasurementType.LEVEL_TIME:
      return t('exercise:repsLabel.time')
    case MeasurementType.DISTANCE:
    case MeasurementType.WEIGHT_DISTANCE:
    case MeasurementType.LEVEL_DISTANCE:
      return t('exercise:repsLabel.distance')
    case MeasurementType.CALORIES:
    case MeasurementType.LEVEL_CALORIES:
      return t('exercise:repsLabel.calories')
    case MeasurementType.DISTANCE_TIME:
    case MeasurementType.DISTANCE_PACE:
      return t('exercise:repsLabel.distance')
    default:
      return t('exercise:repsLabel.reps')
  }
}

export function getRepsPlaceholder(measurementType) {
  switch (measurementType) {
    case MeasurementType.WEIGHT_REPS:
    case MeasurementType.REPS_ONLY:
      return t('exercise:repsPlaceholder.reps')
    case MeasurementType.TIME:
    case MeasurementType.WEIGHT_TIME:
    case MeasurementType.LEVEL_TIME:
      return t('exercise:repsPlaceholder.time')
    case MeasurementType.DISTANCE:
    case MeasurementType.WEIGHT_DISTANCE:
    case MeasurementType.LEVEL_DISTANCE:
      return t('exercise:repsPlaceholder.distance')
    case MeasurementType.CALORIES:
    case MeasurementType.LEVEL_CALORIES:
      return t('exercise:repsPlaceholder.calories')
    case MeasurementType.DISTANCE_TIME:
    case MeasurementType.DISTANCE_PACE:
      return t('exercise:repsPlaceholder.distanceTime')
    default:
      return t('exercise:repsPlaceholder.reps')
  }
}
