import { describe, it, expect } from 'vitest'
import { getRoutineDayLayout, applyExerciseOrderToBlocks, placeInSupersetForDay } from './routineDayLayout.js'

const warmup = (exercises) => ({ name: 'Calentamiento', routine_exercises: exercises })
const main = (exercises) => ({ name: 'Principal', routine_exercises: exercises })

describe('getRoutineDayLayout', () => {
  it('devuelve ambos bloques y los ejercicios en orden calentamiento → principal', () => {
    const w = { id: 1 }
    const m = { id: 2 }
    const layout = getRoutineDayLayout([warmup([w]), main([m])])

    expect(layout.warmupExercises).toEqual([w])
    expect(layout.mainExercises).toEqual([m])
    expect(layout.allExercises).toEqual([w, m])
    expect(layout.showWarmupSection).toBe(true)
    expect(layout.showMainSection).toBe(true)
    expect(layout.showEmptyMessage).toBe(false)
  })

  it('un calentamiento sin ejercicios no pinta sección: solo su fila de añadir', () => {
    const layout = getRoutineDayLayout([warmup([]), main([{ id: 2 }])])

    expect(layout.warmupBlock).not.toBeNull()
    expect(layout.showWarmupSection).toBe(false)
    expect(layout.showMainSection).toBe(true)
    expect(layout.showEmptyMessage).toBe(false)
  })

  it('un bloque principal sin ejercicios tampoco pinta sección', () => {
    const layout = getRoutineDayLayout([warmup([{ id: 1 }]), main([])])

    expect(layout.showMainSection).toBe(false)
    // El día SÍ tiene ejercicios (en calentamiento): el aviso de día vacío no aparece.
    expect(layout.showEmptyMessage).toBe(false)
  })

  it('un día sin ningún ejercicio pide el aviso de vacío', () => {
    const layout = getRoutineDayLayout([warmup([]), main([])])

    expect(layout.showWarmupSection).toBe(false)
    expect(layout.showMainSection).toBe(false)
    expect(layout.showEmptyMessage).toBe(true)
  })

  it('un día sin bloques todavía creados se comporta como un día vacío', () => {
    const layout = getRoutineDayLayout([])

    expect(layout.warmupBlock).toBeNull()
    expect(layout.mainBlock).toBeNull()
    expect(layout.allExercises).toEqual([])
    expect(layout.showEmptyMessage).toBe(true)
  })

  it('tolera blocks null/undefined (query todavía sin datos)', () => {
    for (const blocks of [null, undefined]) {
      const layout = getRoutineDayLayout(blocks)
      expect(layout.warmupBlock).toBeNull()
      expect(layout.mainBlock).toBeNull()
      expect(layout.allExercises).toEqual([])
      expect(layout.showEmptyMessage).toBe(true)
    }
  })

  it('ignora bloques que no son calentamiento ni principal', () => {
    const layout = getRoutineDayLayout([{ name: 'Añadido', routine_exercises: [{ id: 9 }] }])

    expect(layout.allExercises).toEqual([])
    expect(layout.showEmptyMessage).toBe(true)
  })
})

describe('getRoutineDayLayout — totalSets', () => {
  it('suma las series de calentamiento y principal', () => {
    const layout = getRoutineDayLayout([warmup([{ id: 1, series: 2 }]), main([{ id: 2, series: 4 }, { id: 3, series: 3 }])])

    expect(layout.totalSets).toBe(9)
  })

  it('un día sin bloques tiene 0 series', () => {
    expect(getRoutineDayLayout([]).totalSets).toBe(0)
    expect(getRoutineDayLayout(null).totalSets).toBe(0)
  })

  it('una fila sin series no rompe la suma', () => {
    expect(getRoutineDayLayout([main([{ id: 1, series: 3 }, { id: 2 }])]).totalSets).toBe(3)
  })
})

describe('applyExerciseOrderToBlocks', () => {
  const blocks = [
    warmup([{ id: 10, sort_order: 1 }, { id: 11, sort_order: 2 }]),
    main([{ id: 20, sort_order: 3 }, { id: 21, sort_order: 4, superset_group: 1 }]),
  ]

  it('recoloca cada ejercicio en su bloque y renumera sort_order 1..n', () => {
    const result = applyExerciseOrderToBlocks(blocks, [11, 10, 21, 20])

    expect(result[0].routine_exercises).toEqual([
      { id: 11, sort_order: 1 },
      { id: 10, sort_order: 2 },
    ])
    expect(result[1].routine_exercises).toEqual([
      { id: 21, sort_order: 3, superset_group: 1 },
      { id: 20, sort_order: 4 },
    ])
  })

  it('no toca superset_group ni el resto de campos de la fila', () => {
    const result = applyExerciseOrderToBlocks(blocks, [10, 11, 21, 20])
    expect(result[1].routine_exercises.map(re => re.superset_group)).toEqual([1, undefined])
  })

  it('no muta los bloques de entrada', () => {
    applyExerciseOrderToBlocks(blocks, [11, 10, 21, 20])
    expect(blocks[0].routine_exercises.map(re => re.id)).toEqual([10, 11])
  })

  it('devuelve los bloques tal cual si el orden no nombra a los mismos ejercicios', () => {
    expect(applyExerciseOrderToBlocks(blocks, [11, 10, 21])).toBe(blocks)
    expect(applyExerciseOrderToBlocks(blocks, [11, 10, 21, 99])).toBe(blocks)
  })

  it('tolera bloques u orden ausentes', () => {
    expect(applyExerciseOrderToBlocks(null, [1])).toBeNull()
    expect(applyExerciseOrderToBlocks(blocks, null)).toBe(blocks)
    expect(applyExerciseOrderToBlocks([], [])).toEqual([])
  })
})

describe('applyExerciseOrderToBlocks — with membership', () => {
  const blocks = [
    warmup([{ id: 10, sort_order: 1 }]),
    main([
      { id: 20, sort_order: 2, superset_group: null },
      { id: 21, sort_order: 3, superset_group: 1 },
      { id: 22, sort_order: 4, superset_group: 1 },
    ]),
  ]

  it('sets superset_group only on the items that carry supersetGroup', () => {
    const result = applyExerciseOrderToBlocks(blocks, [{ id: 10 }, { id: 21 }, { id: 20, supersetGroup: 1 }, { id: 22 }])

    expect(result[1].routine_exercises).toEqual([
      { id: 21, sort_order: 2, superset_group: 1 },
      { id: 20, sort_order: 3, superset_group: 1 },
      { id: 22, sort_order: 4, superset_group: 1 },
    ])
  })

  it('supersetGroup null takes the row out of the superset', () => {
    const result = applyExerciseOrderToBlocks(blocks, [{ id: 10 }, { id: 20 }, { id: 22 }, { id: 21, supersetGroup: null }])
    expect(result[1].routine_exercises.map(re => [re.id, re.superset_group])).toEqual([[20, null], [22, 1], [21, null]])
  })

  it('returns the blocks unchanged if the items do not name the same exercises', () => {
    expect(applyExerciseOrderToBlocks(blocks, [{ id: 10 }, { id: 20, supersetGroup: 1 }])).toBe(blocks)
  })
})

describe('placeInSupersetForDay', () => {
  const day = [
    { id: 11, sort_order: 2, is_warmup: true, superset_group: null },
    { id: 10, sort_order: 1, is_warmup: true, superset_group: null },
    { id: 20, sort_order: 3, is_warmup: false, superset_group: null },
    { id: 21, sort_order: 4, is_warmup: false, superset_group: 1 },
    { id: 22, sort_order: 5, is_warmup: false, superset_group: 1 },
    { id: 23, sort_order: 6, is_warmup: false, superset_group: null },
  ]

  it('takes a main-block member out and returns the whole day, warm-up first', () => {
    expect(placeInSupersetForDay(day, { routineExerciseId: 21, supersetGroup: null })).toEqual([
      { id: 10 }, { id: 11 }, { id: 20 }, { id: 22 }, { id: 21, supersetGroup: null }, { id: 23 },
    ])
  })

  it('joins an individual at an explicit position in the chosen run', () => {
    expect(placeInSupersetForDay(day, { routineExerciseId: 23, supersetGroup: 1, targetIndex: 0, firstMemberId: 21 })).toEqual([
      { id: 10 }, { id: 11 }, { id: 20 }, { id: 23, supersetGroup: 1 }, { id: 21 }, { id: 22 },
    ])
  })

  it('applies the rule to the exercise\'s own block only: the main block\'s group does not count in the warm-up', () => {
    // Group 1 has no members in the warm-up: it is set in place.
    expect(placeInSupersetForDay(day, { routineExerciseId: 11, supersetGroup: 1 })).toEqual([
      { id: 10 }, { id: 11, supersetGroup: 1 }, { id: 20 }, { id: 21 }, { id: 22 }, { id: 23 },
    ])
  })

  it('returns null if there is nothing to write or the exercise is not in the day', () => {
    expect(placeInSupersetForDay(day, { routineExerciseId: 20, supersetGroup: null })).toBeNull()
    expect(placeInSupersetForDay(day, { routineExerciseId: 99, supersetGroup: null })).toBeNull()
    expect(placeInSupersetForDay(null, { routineExerciseId: 21, supersetGroup: null })).toBeNull()
  })
})
