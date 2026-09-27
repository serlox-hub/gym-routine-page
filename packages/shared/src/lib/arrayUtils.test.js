import { describe, it, expect } from 'vitest'
import {
  reorderArrayItem,
  swapArrayElements,
  calculateNextSortOrder,
  findIndexById,
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

  describe('filterExercises', () => {
    const exercises = [
      { name: 'Press banca', muscle_group_id: 1, is_system: true, equipment_type: { id: 10 } },
      { name: 'Press militar', muscle_group_id: 2, is_system: true, equipment_type: { id: 10 } },
      { name: 'Curl bíceps', muscle_group_id: 3, is_system: false, equipment_type: { id: 20 } },
      { name: 'Extensión tríceps', muscle_group_id: 3, is_system: true, equipment_type: { id: 20 } },
    ]

    it('filtra por término de búsqueda', () => {
      const result = filterExercises(exercises, { search: 'press' })
      expect(result).toHaveLength(2)
    })

    it('filtra por grupo muscular', () => {
      const result = filterExercises(exercises, { muscleGroupId: 3 })
      expect(result).toHaveLength(2)
    })

    it('filtra por tipo de equipo', () => {
      const result = filterExercises(exercises, { equipmentTypeId: 10 })
      expect(result).toHaveLength(2)
    })

    it('filtra por origen (custom / system)', () => {
      expect(filterExercises(exercises, { sourceFilter: 'custom' })).toHaveLength(1)
      expect(filterExercises(exercises, { sourceFilter: 'system' })).toHaveLength(3)
    })

    it('combina búsqueda y grupo muscular', () => {
      const result = filterExercises(exercises, { search: 'press', muscleGroupId: 1 })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Press banca')
    })

    it('retorna todo sin filtros', () => {
      expect(filterExercises(exercises)).toHaveLength(4)
      expect(filterExercises(exercises, {})).toHaveLength(4)
    })

    it('retorna array vacío si exercises es null', () => {
      expect(filterExercises(null, { search: 'test' })).toEqual([])
    })

    it('search null/undefined se trata como sin búsqueda (no crashea)', () => {
      expect(filterExercises(exercises, { search: null })).toHaveLength(4)
      expect(filterExercises(exercises, { search: undefined })).toHaveLength(4)
    })

    it('usa el accessor getName para el nombre traducido', () => {
      const list = [
        { name: 'x', label: 'Peso muerto rumano' },
        { name: 'y', label: 'Curl bíceps' },
      ]
      const result = filterExercises(list, { search: 'rum', getName: e => e.label })
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Peso muerto rumano')
    })

    it('coincide por subsecuencia dispersa', () => {
      const list = [
        { name: 'Peso muerto rumano', muscle_group_id: 5 },
        { name: 'Press banca', muscle_group_id: 1 },
      ]
      const result = filterExercises(list, { search: 'pmr' })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Peso muerto rumano')
    })

    it('ordena por relevancia (prefijo primero)', () => {
      const list = [
        { name: 'Banca press invertido', muscle_group_id: 1 },
        { name: 'Press banca', muscle_group_id: 1 },
      ]
      const result = filterExercises(list, { search: 'press' })
      expect(result[0].name).toBe('Press banca')
    })
  })
})
