import { describe, it, expect } from 'vitest'
import { getRoutineDayLayout, applyExerciseOrderToBlocks } from './routineDayLayout.js'

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
