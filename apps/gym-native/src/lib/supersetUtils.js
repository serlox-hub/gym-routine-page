/**
 * Utilidades para manejo de supersets
 */

/**
 * Formatea el label de un superset (ej: "Superset A", "Superset B")
 * @param {number} supersetId - ID del superset (1, 2, 3...)
 * @returns {string} Label formateado
 */
export function formatSupersetLabel(supersetId) {
  if (supersetId == null || supersetId < 1) return ''
  return `Superset ${String.fromCharCode(64 + supersetId)}`
}

/**
 * Obtiene la letra del superset (ej: "A", "B", "C")
 * @param {number} supersetId - ID del superset (1, 2, 3...)
 * @returns {string} Letra del superset
 */
export function getSupersetLetter(supersetId) {
  if (supersetId == null || supersetId < 1) return ''
  return String.fromCharCode(64 + supersetId)
}

/**
 * Extrae los IDs únicos de supersets de una lista de ejercicios
 * @param {Array} exercises - Lista de ejercicios con superset_group
 * @returns {Array<number>} Array ordenado de IDs de supersets
 */
export function getExistingSupersetIds(exercises) {
  if (!exercises || !Array.isArray(exercises)) return []

  const supersets = new Set()
  exercises.forEach(exercise => {
    if (exercise.superset_group != null) {
      supersets.add(exercise.superset_group)
    }
  })
  return Array.from(supersets).sort((a, b) => a - b)
}

/**
 * Calcula el siguiente ID disponible para un nuevo superset
 * @param {Array<number>} existingIds - IDs de supersets existentes
 * @returns {number} Siguiente ID disponible
 */
export function getNextSupersetId(existingIds) {
  if (!existingIds || !Array.isArray(existingIds) || existingIds.length === 0) {
    return 1
  }
  return Math.max(...existingIds) + 1
}

/**
 * Verifica si un ejercicio pertenece a un superset
 * @param {Object} routineExercise - Ejercicio de rutina
 * @returns {boolean}
 */
export function isExerciseInSuperset(routineExercise) {
  return routineExercise?.superset_group != null
}

/**
 * Cuenta el total de ejercicios en un bloque (considerando supersets)
 * @param {Object} block - Bloque con exerciseGroups
 * @returns {number} Total de ejercicios
 */
export function countExercisesInBlock(block) {
  if (!block?.exerciseGroups) return 0

  return block.exerciseGroups.reduce((count, group) => {
    return count + (group.type === 'individual' ? 1 : group.exercises.length)
  }, 0)
}
