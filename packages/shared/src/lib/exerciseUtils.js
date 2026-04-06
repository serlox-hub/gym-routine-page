import { getCurrentLocale } from '../i18n/index.js'

/**
 * Returns the exercise name in the current locale.
 * Falls back to name_es if name_en is not available.
 */
export function getExerciseName(exercise) {
  if (!exercise) return ''
  const locale = getCurrentLocale()
  if (locale === 'en' && exercise.name_en) return exercise.name_en
  return exercise.name || exercise.name_es || ''
}

/**
 * Resolves the weight unit for an exercise.
 * Priority: exercise override > user preference > 'kg'
 */
/**
 * Resolves the weight unit for an exercise.
 * Priority: exercise override > user preference > 'kg'
 */
export function resolveWeightUnit(exercise, userPreferences) {
  return exercise?.weight_unit
    || userPreferences?.weight_unit
    || 'kg'
}

/**
 * Returns the exercise instructions as a displayable string.
 * Handles both legacy TEXT format (user exercises) and new JSONB format (system exercises).
 */
export function getExerciseInstructions(exercise) {
  const instructions = exercise?.instructions
  if (!instructions) return ''
  if (typeof instructions === 'string') return instructions

  const locale = getCurrentLocale()
  const localized = (locale === 'en' && instructions.en) ? instructions.en : instructions.es
  if (!localized) return ''

  const parts = []
  if (localized.setup) parts.push(localized.setup)
  if (localized.execution) parts.push(localized.execution)
  if (localized.cues?.length) parts.push(localized.cues.join('. '))
  return parts.join('\n')
}

/**
 * Returns structured instructions for detailed display (system exercises).
 * Returns null for legacy string instructions.
 */
export function getStructuredInstructions(exercise) {
  const instructions = exercise?.instructions
  if (!instructions || typeof instructions === 'string') return null

  const locale = getCurrentLocale()
  return (locale === 'en' && instructions.en) ? instructions.en : instructions.es
}
