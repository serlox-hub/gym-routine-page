/**
 * Utilidades para manipulación de arrays
 */

import { tokenizeSearchQuery, getSearchRank, compareSearchRanks } from './textUtils.js'

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
 * Filters and sorts exercises for the picker: word search (see getSearchRank)
 * plus the muscle group / equipment / source filters, all ANDed. One
 * implementation for web and native. Same input, same output.
 *
 * Typos only rescue a query that finds nothing better: of the matches, only
 * those with the fewest typos are kept, so `press` does not bring "Prensa"
 * (one typo) next to the "Press ..." that match with none. The cut is taken
 * after the filters, over what the user can actually see.
 *
 * @param {Array} exercises
 * @param {Object} [filters]
 * @param {string} [filters.search] - Query (no words => no text filter, incoming order kept)
 * @param {number|null} [filters.muscleGroupId] - null => all
 * @param {number|null} [filters.equipmentTypeId] - null => all
 * @param {'all'|'custom'|'system'} [filters.sourceFilter] - 'all' by default
 * @param {Function} [filters.getName] - Name to search (default: e => e.name).
 *        Web/native pass getExerciseName (localized name).
 * @param {Function} [filters.getMuscleGroupText] - Muscle group to search (default: none).
 *        Web/native pass e => getMuscleGroupName(e.muscle_group).
 * @param {Function} [filters.getEquipmentText] - Equipment to search (default: none).
 *        Web/native pass e => getEquipmentName(e.equipment_type).
 * @returns {Array} Filtered exercises, sorted by relevance only when searching
 */
export function filterExercises(exercises, filters = {}) {
  if (!exercises) return []

  const {
    search = '',
    muscleGroupId = null,
    equipmentTypeId = null,
    sourceFilter = 'all',
    getName = e => e.name,
    getMuscleGroupText = () => '',
    getEquipmentText = () => '',
  } = filters

  const visible = exercises.filter(e => {
    if (muscleGroupId && e.muscle_group_id !== muscleGroupId) return false
    if (equipmentTypeId && e.equipment_type?.id !== equipmentTypeId) return false
    if (sourceFilter === 'custom' && e.is_system) return false
    if (sourceFilter === 'system' && !e.is_system) return false
    return true
  })

  const queryWords = tokenizeSearchQuery(search)
  if (queryWords.length === 0) return visible

  const rankVisible = allowTypos => {
    const matches = []
    visible.forEach((e, index) => {
      const rank = getSearchRank({
        name: getName(e),
        muscleGroup: getMuscleGroupText(e),
        secondary: [getEquipmentText(e)],
      }, queryWords, { allowTypos })
      if (rank) matches.push({ e, rank, index })
    })
    return matches
  }
  // Any match with no typo hides every match with one, so typos (the costly
  // part, on every keystroke) are only computed when there is none.
  const exact = rankVisible(false)
  const matches = exact.length > 0 ? exact : rankVisible(true)

  const minTypos = Math.min(...matches.map(({ rank }) => rank.typos))
  return matches
    .filter(({ rank }) => rank.typos === minTypos)
    // The index keeps ties in incoming order whatever the engine's sort does.
    .sort((a, b) => compareSearchRanks(a.rank, b.rank) || a.index - b.index)
    .map(({ e }) => e)
}
