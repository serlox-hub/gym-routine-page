import { describe, it, expect } from 'vitest'
import {
  reorderArrayItem,
  swapArrayElements,
  calculateNextSortOrder,
  findIndexById,
  moveItemById,
  filterBySearchTerm,
  filterExercises,
} from './arrayUtils.js'

describe('arrayUtils', () => {
  describe('reorderArrayItem', () => {
    const array = ['a', 'b', 'c', 'd']

    it('mueve elemento hacia arriba', () => {
      const result = reorderArrayItem(array, 2, 'up')
      expect(result).toEqual(['a', 'c', 'b', 'd'])
    })

    it('mueve elemento hacia abajo', () => {
      const result = reorderArrayItem(array, 1, 'down')
      expect(result).toEqual(['a', 'c', 'b', 'd'])
    })

    it('retorna null si no puede mover hacia arriba', () => {
      expect(reorderArrayItem(array, 0, 'up')).toBeNull()
    })

    it('retorna null si no puede mover hacia abajo', () => {
      expect(reorderArrayItem(array, 3, 'down')).toBeNull()
    })

    it('no modifica el array original', () => {
      const original = ['a', 'b', 'c']
      reorderArrayItem(original, 1, 'up')
      expect(original).toEqual(['a', 'b', 'c'])
    })
  })

  describe('swapArrayElements', () => {
    const array = ['a', 'b', 'c', 'd']

    it('intercambia elementos hacia arriba', () => {
      const result = swapArrayElements(array, 2, 'up')
      expect(result).toEqual(['a', 'c', 'b', 'd'])
    })

    it('intercambia elementos hacia abajo', () => {
      const result = swapArrayElements(array, 1, 'down')
      expect(result).toEqual(['a', 'c', 'b', 'd'])
    })

    it('retorna null si no puede intercambiar hacia arriba', () => {
      expect(swapArrayElements(array, 0, 'up')).toBeNull()
    })

    it('retorna null si no puede intercambiar hacia abajo', () => {
      expect(swapArrayElements(array, 3, 'down')).toBeNull()
    })

    it('no modifica el array original', () => {
      const original = ['a', 'b', 'c']
      swapArrayElements(original, 1, 'up')
      expect(original).toEqual(['a', 'b', 'c'])
    })
  })

  describe('calculateNextSortOrder', () => {
    it('retorna 1 para array vacío', () => {
      expect(calculateNextSortOrder([])).toBe(1)
    })

    it('retorna 1 para null', () => {
      expect(calculateNextSortOrder(null)).toBe(1)
    })

    it('calcula siguiente orden correctamente', () => {
      const items = [{ sort_order: 1 }, { sort_order: 3 }, { sort_order: 2 }]
      expect(calculateNextSortOrder(items)).toBe(4)
    })

    it('maneja items sin sort_order', () => {
      const items = [{ sort_order: 2 }, {}]
      expect(calculateNextSortOrder(items)).toBe(3)
    })

    it('usa defaultOrder personalizado', () => {
      expect(calculateNextSortOrder([], 5)).toBe(6)
    })
  })

  describe('findIndexById', () => {
    const array = [{ id: 1 }, { id: 2 }, { id: 3 }]

    it('encuentra índice por id', () => {
      expect(findIndexById(array, 2)).toBe(1)
    })

    it('retorna -1 si no encuentra', () => {
      expect(findIndexById(array, 99)).toBe(-1)
    })

    it('funciona con strings como id', () => {
      const strArray = [{ id: 'a' }, { id: 'b' }]
      expect(findIndexById(strArray, 'b')).toBe(1)
    })
  })

  describe('moveItemById', () => {
    const array = [{ id: 1 }, { id: 2 }, { id: 3 }]

    it('mueve item hacia arriba por id', () => {
      const result = moveItemById(array, 2, 'up')
      expect(result.map(i => i.id)).toEqual([2, 1, 3])
    })

    it('mueve item hacia abajo por id', () => {
      const result = moveItemById(array, 2, 'down')
      expect(result.map(i => i.id)).toEqual([1, 3, 2])
    })

    it('retorna null si no encuentra el id', () => {
      expect(moveItemById(array, 99, 'up')).toBeNull()
    })

    it('retorna null si no puede mover', () => {
      expect(moveItemById(array, 1, 'up')).toBeNull()
    })
  })

  describe('filterBySearchTerm', () => {
    const array = [
      { name: 'Press banca' },
      { name: 'Press militar' },
      { name: 'Curl bíceps' },
    ]

    it('filtra por término de búsqueda', () => {
      const result = filterBySearchTerm(array, 'press')
      expect(result).toHaveLength(2)
    })

    it('es case insensitive', () => {
      const result = filterBySearchTerm(array, 'PRESS')
      expect(result).toHaveLength(2)
    })

    it('retorna todo si no hay término', () => {
      expect(filterBySearchTerm(array, '')).toEqual(array)
      expect(filterBySearchTerm(array, null)).toEqual(array)
    })

    it('retorna array vacío si array es null', () => {
      expect(filterBySearchTerm(null, 'test')).toEqual([])
    })

    it('busca en propiedad personalizada', () => {
      const items = [{ title: 'Foo' }, { title: 'Bar' }]
      const result = filterBySearchTerm(items, 'foo', 'title')
      expect(result).toHaveLength(1)
    })

    it('trim del término de búsqueda', () => {
      const result = filterBySearchTerm(array, '  press  ')
      expect(result).toHaveLength(2)
    })
  })

  describe('filterExercises', () => {
    const exercises = [
      { name: 'Press banca', muscle_group_id: 1 },
      { name: 'Press militar', muscle_group_id: 2 },
      { name: 'Curl bíceps', muscle_group_id: 3 },
      { name: 'Extensión tríceps', muscle_group_id: 3 },
    ]

    it('filtra por término de búsqueda', () => {
      const result = filterExercises(exercises, 'press', null)
      expect(result).toHaveLength(2)
    })

    it('filtra por grupo muscular', () => {
      const result = filterExercises(exercises, '', 3)
      expect(result).toHaveLength(2)
    })

    it('filtra por ambos criterios', () => {
      const result = filterExercises(exercises, 'press', 1)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Press banca')
    })

    it('retorna todo sin filtros', () => {
      const result = filterExercises(exercises, '', null)
      expect(result).toHaveLength(4)
    })

    it('retorna array vacío si exercises es null', () => {
      expect(filterExercises(null, 'test', 1)).toEqual([])
    })
  })
})
