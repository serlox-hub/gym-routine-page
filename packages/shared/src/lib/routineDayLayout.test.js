import { describe, it, expect } from 'vitest'
import { getRoutineDayLayout } from './routineDayLayout.js'

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
