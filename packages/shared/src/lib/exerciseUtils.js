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
 * Returns a shallow copy of the exercise with `name` resolved to the current locale.
 * Use in hook `select` transforms so components can just use exercise.name.
 */
export function localizeExercise(exercise) {
  if (!exercise || exercise.name_en === undefined) return exercise
  return { ...exercise, name: getExerciseName(exercise) }
}

/**
 * Localizes exercise names in nested data structures.
 * Handles: items with .exercise, .session_exercises[].exercise,
 * .routine_exercises[].exercise, and top-level exercises.
 */
export function localizeExercisesInList(items) {
  if (!items) return items
  return items.map(item => {
    let result = item

    // Direct exercise field (session_exercises, routine_exercises items)
    if (item.exercise) {
      result = { ...result, exercise: localizeExercise(item.exercise) }
    }

    // Nested session_exercises (e.g., session detail, workout history)
    if (item.session_exercises) {
      result = {
        ...result,
        session_exercises: item.session_exercises.map(se =>
          se.exercise ? { ...se, exercise: localizeExercise(se.exercise) } : se
        ),
      }
    }

    // Nested routine_exercises (e.g., routine blocks)
    if (item.routine_exercises) {
      result = {
        ...result,
        routine_exercises: item.routine_exercises.map(re =>
          re.exercise ? { ...re, exercise: localizeExercise(re.exercise) } : re
        ),
      }
    }

    // Top-level exercise (e.g., from useExercisesWithMuscleGroup)
    if (result === item && item.name_en !== undefined) {
      return localizeExercise(item)
    }

    return result
  })
}

/**
 * Resolves the weight unit for an exercise.
 * Priority: user exercise override > user global preference > 'kg'
 */
export function resolveWeightUnit(override, userPreferences) {
  return override?.weight_unit
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

/**
 * Returns the muscle group name in the current locale.
 * Receives the muscle_group object from a Supabase join (with name alias + name_en).
 */
export function getMuscleGroupName(muscleGroup) {
  if (!muscleGroup) return ''
  const locale = getCurrentLocale()
  if (locale === 'en' && muscleGroup.name_en) return muscleGroup.name_en
  return muscleGroup.name || muscleGroup.name_es || ''
}

/**
 * Returns the equipment type name in the current locale.
 * Receives the equipment_type object from a Supabase join (with name alias + name_en).
 */
export function getEquipmentName(equipmentType) {
  if (!equipmentType) return ''
  const locale = getCurrentLocale()
  if (locale === 'en' && equipmentType.name_en) return equipmentType.name_en
  return equipmentType.name || equipmentType.name_es || ''
}
