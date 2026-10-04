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

    describe('word search', () => {
      const catalog = [
        { name: 'Remo con mancuerna', group: 'Espalda', equipment: 'Mancuernas', muscle_group_id: 1 },
        { name: 'Press de banca', group: 'Pecho', equipment: 'Barra', muscle_group_id: 2 },
        { name: 'Press militar', group: 'Hombros', equipment: 'Barra', muscle_group_id: 3 },
        { name: 'Curl de bíceps con barra', group: 'Bíceps', equipment: 'Barra', muscle_group_id: 4 },
        { name: 'Prensa de piernas', group: 'Cuádriceps', equipment: 'Máquina', muscle_group_id: 5 },
        { name: 'Aperturas en polea', group: 'Pecho', equipment: 'Polea', muscle_group_id: 2 },
        { name: 'Peso muerto rumano', group: 'Isquiotibiales', equipment: 'Barra', muscle_group_id: 6 },
        { name: 'Jalón al pecho', group: 'Espalda', equipment: 'Polea', muscle_group_id: 1 },
        { name: 'Curl predicador', group: 'Bíceps', equipment: 'Barra', muscle_group_id: 4 },
        { name: 'Pullover con mancuerna', group: 'Pecho', equipment: 'Mancuernas', muscle_group_id: 2 },
        { name: 'Remo con mancuernas', group: 'Espalda', equipment: 'Mancuernas', muscle_group_id: 1 },
      ]
      const english = [
        { name: 'Bench Press', group: 'Chest', equipment: 'Barbell' },
        { name: 'Pull-Ups', group: 'Back', equipment: 'Bodyweight' },
        { name: 'Push-Ups', group: 'Chest', equipment: 'Bodyweight' },
      ]
      const search = (query, list = catalog, filters = {}) =>
        filterExercises(list, {
          search: query,
          getMuscleGroupText: e => e.group,
          getEquipmentText: e => e.equipment,
          ...filters,
        }).map(e => e.name)

      it.each([
        ['mancuerna remo', ['Remo con mancuerna', 'Remo con mancuernas']],
        ['banca press', ['Press de banca']],
        ['press banca', ['Press de banca']],
        // Curl predicador matches through its muscle group (Bíceps).
        ['biseps', ['Curl de bíceps con barra', 'Curl predicador']],
        // "Prensa" is one typo away, and dropped because the two "Press" need none.
        ['press', ['Press militar', 'Press de banca']],
        ['pres', ['Press militar', 'Press de banca']],
        ['prensa', ['Prensa de piernas']],
        ['presss', ['Press militar', 'Press de banca']],
        ['pecho', ['Press de banca', 'Aperturas en polea', 'Pullover con mancuerna', 'Jalón al pecho']],
        // Jalón al pecho also matches: "pecho" in its name and "polea" in its equipment.
        ['pecho polea', ['Aperturas en polea', 'Jalón al pecho']],
        ['curl barra', ['Curl de bíceps con barra', 'Curl predicador']],
        ['remo mancuernas', ['Remo con mancuernas', 'Remo con mancuerna']],
        ['mancuernas', ['Remo con mancuernas', 'Remo con mancuerna', 'Pullover con mancuerna']],
        // "peso" is also one typo away: accepted noise of the 4-letter threshold.
        ['peho', ['Press de banca', 'Aperturas en polea', 'Pullover con mancuerna', 'Peso muerto rumano', 'Jalón al pecho']],
        ['xyz', []],
        // A stopword alone is kept.
        ['de', ['Press de banca', 'Prensa de piernas', 'Curl de bíceps con barra']],
      ])('"%s" finds %j', (query, expected) => {
        expect(search(query)).toEqual(expected)
      })

      it.each(['push up', 'pushup', 'push-ups'])('"%s" finds Push-Ups', (query) => {
        expect(search(query, english)).toEqual(['Push-Ups'])
      })

      it.each(['step-up', 'step up'])('"%s" finds a name that writes it without a hyphen', (query) => {
        const list = [{ name: 'Step up con barra', group: 'Cuádriceps', equipment: 'Barra' }]
        expect(search(query, list)).toEqual(['Step up con barra'])
      })

      it('finds a custom name in another script', () => {
        const list = [...catalog, { name: 'Жим гантелей', group: 'Pecho', equipment: 'Mancuernas' }]
        expect(search('жим', list)).toEqual(['Жим гантелей'])
      })

      it('among matches that need typos, keeps only those with the fewest', () => {
        // "mancurna" is one typo from Mancuerna and two from Mancuerma.
        const names = list => filterExercises(list, { search: 'mancurna' }).map(e => e.name)
        expect(names([{ name: 'Mancuerma' }])).toEqual(['Mancuerma'])
        expect(names([{ name: 'Mancuerma' }, { name: 'Mancuerna' }])).toEqual(['Mancuerna'])
        expect(names([{ name: 'Mancuerna' }, { name: 'Mancuerma' }])).toEqual(['Mancuerna'])
      })

      it('copes with exercises that have no muscle group or equipment text', () => {
        const list = [{ name: 'Remo' }, { name: 'Press' }]
        const result = filterExercises(list, {
          search: 'rem',
          getMuscleGroupText: () => null,
          getEquipmentText: () => undefined,
        })
        expect(result.map(e => e.name)).toEqual(['Remo'])
      })

      it('returns a new array and leaves the incoming list untouched', () => {
        const list = [{ name: 'Press militar con barra' }, { name: 'Press' }]
        const original = [...list]
        const sorted = filterExercises(list, { search: 'press' })
        expect(sorted.map(e => e.name)).toEqual(['Press', 'Press militar con barra'])
        expect(list[0]).toBe(original[0])
        expect(list[1]).toBe(original[1])
        const unsearched = filterExercises(list, { search: '' })
        expect(unsearched).toEqual(list)
        expect(unsearched).not.toBe(list)
      })

      it('keeps the incoming order with no query words', () => {
        const all = catalog.map(e => e.name)
        expect(search('')).toEqual(all)
        expect(search('   ')).toEqual(all)
        expect(search(' - / ')).toEqual(all)
      })

      it('ANDs the text with the filters', () => {
        expect(search('press', catalog, { muscleGroupId: 2 })).toEqual(['Press de banca'])
        expect(search('remo', catalog, { muscleGroupId: 2 })).toEqual([])
      })

      it('takes the fewest-typos cut over the filtered list', () => {
        // Without the filter the two "Press" hide "Prensa"; with it they are not visible.
        expect(search('press', catalog, { muscleGroupId: 5 })).toEqual(['Prensa de piernas'])
      })

      it('searches only the name when no accessors are passed', () => {
        const list = catalog.map(({ group, equipment, ...e }) => e)
        // The singular names are one typo away and the plural one needs none.
        expect(filterExercises(list, { search: 'mancuernas' }).map(e => e.name)).toEqual(['Remo con mancuernas'])
      })

      it('filters 500 exercises in well under a frame', () => {
        const words = ['press', 'remo', 'curl', 'jalón', 'sentadilla', 'zancada', 'extensión', 'elevación']
        const tails = ['inclinado', 'con barra', 'en polea', 'a una mano', 'de pie', 'sentado', 'agarre neutro']
        const groups = ['Pecho', 'Espalda', 'Bíceps', 'Cuádriceps', 'Hombros']
        const equipment = ['Barra', 'Mancuernas', 'Polea', 'Máquina']
        const large = Array.from({ length: 500 }, (_, i) => ({
          name: `${words[i % words.length]} ${tails[i % tails.length]} ${i}`,
          group: groups[i % groups.length],
          equipment: equipment[i % equipment.length],
        }))
        const queries = ['p', 'press', 'presss inclinad', 'sentadila con mancuernas', 'xyzxyz']
        queries.forEach(query => search(query, large)) // warm-up
        // Best of several runs: a GC pause on a loaded CI box is not what this guards against.
        const runs = Array.from({ length: 5 }, () => {
          const start = performance.now()
          queries.forEach(query => search(query, large))
          return (performance.now() - start) / queries.length
        })
        expect(Math.min(...runs)).toBeLessThan(5)
      })
    })
  })
})
