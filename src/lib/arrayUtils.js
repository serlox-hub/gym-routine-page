/**
 * Utilidades para manipulación de arrays
 */

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
 * Mueve un elemento identificado por ID
 * @param {Array} array - Array original
 * @param {*} id - ID del elemento a mover
 * @param {'up'|'down'} direction - Dirección del movimiento
 * @returns {Array|null} Nuevo array o null si no es posible
 */
export function moveItemById(array, id, direction) {
  const currentIndex = findIndexById(array, id)
  if (currentIndex === -1) return null
  return reorderArrayItem(array, currentIndex, direction)
}

/**
 * Filtra un array por término de búsqueda en una propiedad
 * @param {Array} array - Array a filtrar
 * @param {string} searchTerm - Término de búsqueda
 * @param {string} property - Propiedad donde buscar (default: 'name')
 * @returns {Array} Array filtrado
 */
export function filterBySearchTerm(array, searchTerm, property = 'name') {
  if (!array) return []
  if (!searchTerm || !searchTerm.trim()) return array

  const searchLower = searchTerm.toLowerCase().trim()
  return array.filter(item =>
    item[property]?.toLowerCase().includes(searchLower)
  )
}

/**
 * Filtra ejercicios por término de búsqueda y grupo muscular
 * @param {Array} exercises - Array de ejercicios
 * @param {string} searchTerm - Término de búsqueda
 * @param {number|null} muscleGroupId - ID del grupo muscular (null para todos)
 * @returns {Array} Ejercicios filtrados
 */
export function filterExercises(exercises, searchTerm, muscleGroupId) {
  if (!exercises) return []

  let filtered = exercises

  if (searchTerm && searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase().trim()
    filtered = filtered.filter(e =>
      e.name.toLowerCase().includes(searchLower)
    )
  }

  if (muscleGroupId) {
    filtered = filtered.filter(e => e.muscle_group_id === muscleGroupId)
  }

  return filtered
}
