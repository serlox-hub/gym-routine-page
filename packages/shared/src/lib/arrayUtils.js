/**
 * Utilidades para manipulación de arrays
 */

import { fuzzyMatchScore } from './textUtils.js'

/**
 * Reordena un elemento en un array moviéndolo arriba o abajo
 * @param {Array} array - Array original
 * @param {number} currentIndex - Índice actual del elemento
 * @param {'up'|'down'} direction - Dirección del movimiento
 * @returns {Array|null} Nuevo array reordenado o null si no es posible mover
 */
export function reorderArrayItem(array, currentIndex, direction) {
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

  if (newIndex < 0 || newIndex >= array.length) {
    return null
  }

  const result = [...array]
  const [removed] = result.splice(currentIndex, 1)
  result.splice(newIndex, 0, removed)

  return result
}

/**
 * Intercambia dos elementos en un array
 * @param {Array} array - Array original
 * @param {number} index - Índice del primer elemento
 * @param {'up'|'down'} direction - Dirección del intercambio
 * @returns {Array|null} Nuevo array con elementos intercambiados o null si no es posible
 */
export function swapArrayElements(array, index, direction) {
  const newIndex = direction === 'up' ? index - 1 : index + 1

  if (newIndex < 0 || newIndex >= array.length) {
    return null
  }

  const result = [...array]
  const temp = result[index]
  result[index] = result[newIndex]
  result[newIndex] = temp

  return result
}

/**
 * Calcula el siguiente sort_order para una lista de items
 * @param {Array} items - Array de items con sort_order
 * @param {number} defaultOrder - Valor por defecto si el array está vacío
 * @returns {number} Siguiente sort_order
 */
export function calculateNextSortOrder(items, defaultOrder = 0) {
  if (!items || items.length === 0) {
    return defaultOrder + 1
  }
  const maxOrder = Math.max(...items.map(item => item.sort_order || 0))
  return maxOrder + 1
}

/**
 * Encuentra un elemento por ID en un array
 * @param {Array} array - Array de elementos con propiedad id
 * @param {*} id - ID a buscar
 * @returns {number} Índice del elemento o -1 si no se encuentra
 */
export function findIndexById(array, id) {
  return array.findIndex(item => item.id === id)
}

/**
 * Mueve un elemento a una posición específica
 * @param {Array} array - Array original
 * @param {*} id - ID del elemento a mover
 * @param {number} newIndex - Nueva posición (0-indexed)
 * @returns {Array|null} Nuevo array o null si no es posible
 */
export function moveItemToPosition(array, id, newIndex) {
  const currentIndex = findIndexById(array, id)
  if (currentIndex === -1) return null
  if (newIndex < 0 || newIndex >= array.length) return null
  if (currentIndex === newIndex) return array

  const result = [...array]
  const [removed] = result.splice(currentIndex, 1)
  result.splice(newIndex, 0, removed)
  return result
}

/**
 * Encuentra el índice de un ejercicio por sessionExerciseId o id
 * @param {Array} exercises - Array de ejercicios
 * @param {Object} exercise - Ejercicio a buscar
 * @returns {number} Índice del ejercicio o -1 si no se encuentra
 */
export function findExerciseIndex(exercises, exercise) {
  if (!exercises || !exercise) return -1
  const key = exercise.sessionExerciseId || exercise.id
  return exercises.findIndex(e => (e.sessionExerciseId || e.id) === key)
}

/**
 * Genera props de reordenamiento para un ejercicio en una lista
 * @param {Array} exercises - Array de ejercicios
 * @param {Object} exercise - Ejercicio actual
 * @param {Function} onReorder - Callback (currentIndex, newIndex) => void
 * @returns {Object} Props { onReorderToPosition, currentIndex, totalExercises } o {}
 */
export function getReorderProps(exercises, exercise, onReorder) {
  if (!onReorder || !exercises?.length) return {}

  const index = findExerciseIndex(exercises, exercise)
  if (index === -1) return {}

  return {
    onReorderToPosition: (newIndex) => onReorder(index, newIndex),
    currentIndex: index,
    totalExercises: exercises.length,
  }
}

/**
 * Filtra y ordena ejercicios para el buscador: búsqueda flexible por
 * subsecuencia (case- y tilde-insensitive) + filtros de músculo/equipo/origen +
 * ranking por relevancia. Lógica única compartida por web y native (paridad por
 * construcción). Pura, sin estado.
 *
 * @param {Array} exercises - Array de ejercicios
 * @param {Object} [filters]
 * @param {string} [filters.search] - Término de búsqueda (vacío => sin filtro ni reordenación)
 * @param {number|null} [filters.muscleGroupId] - ID de grupo muscular (null => todos)
 * @param {number|null} [filters.equipmentTypeId] - ID de tipo de equipo (null => todos)
 * @param {'all'|'custom'|'system'} [filters.sourceFilter] - Origen ('all' por defecto)
 * @param {Function} [filters.getName] - Accessor del nombre a buscar (default: e => e.name).
 *                                       Web/native pasan getExerciseName (nombre traducido).
 * @returns {Array} Ejercicios filtrados; ordenados por relevancia solo si hay búsqueda
 */
export function filterExercises(exercises, filters = {}) {
  if (!exercises) return []

  const {
    search = '',
    muscleGroupId = null,
    equipmentTypeId = null,
    sourceFilter = 'all',
    getName = e => e.name,
  } = filters

  const hasSearch = (search || '').trim().length > 0

  const result = exercises
    .map(e => ({ e, score: fuzzyMatchScore(getName(e), search) }))
    .filter(({ e, score }) => {
      if (score === null) return false
      if (muscleGroupId && e.muscle_group_id !== muscleGroupId) return false
      if (equipmentTypeId && e.equipment_type?.id !== equipmentTypeId) return false
      if (sourceFilter === 'custom' && e.is_system) return false
      if (sourceFilter === 'system' && !e.is_system) return false
      return true
    })

  // Ordena por relevancia solo al buscar; sin búsqueda conserva el orden original.
  if (hasSearch) result.sort((a, b) => b.score - a.score)

  return result.map(({ e }) => e)
}
