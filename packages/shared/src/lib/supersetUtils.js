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

/** Largest value the `integer` column `superset_group` holds. */
const MAX_SUPERSET_GROUP = 2147483647

/**
 * Superset groups an imported list can keep, in the block's order. The JSON is untrusted (AI,
 * hand edits), and a superset is a run of CONSECUTIVE rows (#87): a group written as is with one
 * member, or with its members split by other rows, would render as a lonely or doubled purple
 * card. Such a group is undone (its rows become individual), not rejected: the routine still
 * imports. A value that is not a positive integer within the `integer` column's range is dropped
 * too, or the insert fails and leaves the routine half imported.
 * @param {unknown[]} groups - the `superset_group` of each row of ONE list (warmup or main), in order
 * @returns {Array<number|null>} same length; the group to write, or null
 */
export function sanitizeImportedSupersetGroups(groups) {
  const values = (groups || []).map(group => (Number.isInteger(group) && group > 0 && group <= MAX_SUPERSET_GROUP ? group : null))
  const runsByGroup = new Map()
  values.forEach((group, index) => {
    if (group === null) return
    const run = runsByGroup.get(group)
    if (run && run.last === index - 1) {
      run.last = index
      run.size++
    } else {
      runsByGroup.set(group, { last: index, size: 1, split: Boolean(run) })
    }
  })
  return values.map(group => {
    if (group === null) return null
    const run = runsByGroup.get(group)
    return run.size > 1 && !run.split ? group : null
  })
}
