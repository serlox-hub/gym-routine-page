import { describe, it, expect } from 'vitest'
import {
  buildRoutineExerciseMap,
  groupExercisesByBlock,
  groupExercisesBySupersetId,
  buildDefaultExerciseOrder,
  applyCustomExerciseOrder,
  hasCustomOrderChanged,
  transformWorkoutSessionData,
  buildExerciseOrderFromBlocks,
} from './workoutTransforms.js'

describe('workoutTransforms', () => {
  const sampleBlocks = [
    {
      id: 1,
      name: 'Calentamiento',
      sort_order: 0,
      duration_min: 10,
      routine_exercises: [
        { id: 101, sort_order: 0, exercise: { name: 'Cardio' } },
      ],
    },
    {
      id: 2,
      name: 'Principal',
      sort_order: 1,
      duration_min: 45,
      routine_exercises: [
        { id: 201, sort_order: 0, exercise: { name: 'Press banca' } },
        { id: 202, sort_order: 1, exercise: { name: 'Press inclinado' } },
      ],
    },
  ]

  // Bloques con supersets para tests específicos
  const blocksWithSupersets = [
    {
      id: 1,
      name: 'Principal',
      sort_order: 0,
      duration_min: 45,
      routine_exercises: [
        { id: 301, sort_order: 0, superset_group: null, exercise: { name: 'Press banca' } },
        { id: 302, sort_order: 1, superset_group: 1, exercise: { name: 'Curl biceps' } },
        { id: 303, sort_order: 2, superset_group: 1, exercise: { name: 'Press francés' } },
        { id: 304, sort_order: 3, superset_group: null, exercise: { name: 'Sentadilla' } },
      ],
    },
  ]

  describe('buildRoutineExerciseMap', () => {
    it('retorna Map vacío para null', () => {
      const result = buildRoutineExerciseMap(null)
      expect(result.size).toBe(0)
    })

    it('construye mapa de ejercicios', () => {
      const result = buildRoutineExerciseMap(sampleBlocks)
      expect(result.size).toBe(3)
      expect(result.has(101)).toBe(true)
      expect(result.has(201)).toBe(true)
    })

    it('incluye metadata del bloque', () => {
      const result = buildRoutineExerciseMap(sampleBlocks)
      const warmupExercise = result.get(101)
      expect(warmupExercise.blockName).toBe('Calentamiento')
      expect(warmupExercise.isWarmup).toBe(true)

      const mainExercise = result.get(201)
      expect(mainExercise.blockName).toBe('Principal')
      expect(mainExercise.isWarmup).toBe(false)
    })
  })

  describe('groupExercisesByBlock', () => {
    it('retorna array vacío para null', () => {
      expect(groupExercisesByBlock(null)).toEqual([])
    })

    it('agrupa ejercicios por bloque', () => {
      const result = groupExercisesByBlock(sampleBlocks)
      expect(result).toHaveLength(2)
      expect(result[0].blockName).toBe('Calentamiento')
      expect(result[0].exerciseGroups).toHaveLength(1)
      expect(result[1].blockName).toBe('Principal')
      expect(result[1].exerciseGroups).toHaveLength(2)
    })

    it('marca bloques como warmup correctamente', () => {
      const result = groupExercisesByBlock(sampleBlocks)
      expect(result[0].isWarmup).toBe(true)
      expect(result[1].isWarmup).toBe(false)
    })

    it('incluye tipo routine en ejercicios individuales', () => {
      const result = groupExercisesByBlock(sampleBlocks)
      expect(result[0].exerciseGroups[0].type).toBe('individual')
      expect(result[0].exerciseGroups[0].exercise.type).toBe('routine')
    })
  })

  describe('groupExercisesBySupersetId', () => {
    it('retorna array vacío para null', () => {
      expect(groupExercisesBySupersetId(null, 'Principal')).toEqual([])
    })

    it('retorna array vacío para array vacío', () => {
      expect(groupExercisesBySupersetId([], 'Principal')).toEqual([])
    })

    it('agrupa ejercicios individuales correctamente', () => {
      const exercises = [
        { id: 1, sort_order: 0, superset_group: null },
        { id: 2, sort_order: 1, superset_group: null },
      ]
      const result = groupExercisesBySupersetId(exercises, 'Principal')
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('individual')
      expect(result[1].type).toBe('individual')
    })

    it('agrupa ejercicios en supersets', () => {
      const exercises = blocksWithSupersets[0].routine_exercises
      const result = groupExercisesBySupersetId(exercises, 'Principal')

      // Debería tener: individual, superset(2 ejercicios), individual
      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('individual')
      expect(result[0].exercise.id).toBe(301)

      expect(result[1].type).toBe('superset')
      expect(result[1].supersetId).toBe(1)
      expect(result[1].exercises).toHaveLength(2)
      expect(result[1].exercises[0].id).toBe(302)
      expect(result[1].exercises[1].id).toBe(303)

      expect(result[2].type).toBe('individual')
      expect(result[2].exercise.id).toBe(304)
    })

    it('enriquece ejercicios con blockName e isWarmup', () => {
      const exercises = [{ id: 1, sort_order: 0, superset_group: null }]
      const result = groupExercisesBySupersetId(exercises, 'Calentamiento')
      expect(result[0].exercise.blockName).toBe('Calentamiento')
      expect(result[0].exercise.isWarmup).toBe(true)
      expect(result[0].exercise.type).toBe('routine')
    })

    it('marca isWarmup false para bloque principal', () => {
      const exercises = [{ id: 1, sort_order: 0, superset_group: null }]
      const result = groupExercisesBySupersetId(exercises, 'Principal')
      expect(result[0].exercise.isWarmup).toBe(false)
    })
  })

  describe('buildDefaultExerciseOrder', () => {
    it('construye orden plano desde bloques agrupados', () => {
      const grouped = groupExercisesByBlock(sampleBlocks)
      const result = buildDefaultExerciseOrder(grouped)
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe(101)
      expect(result[1].id).toBe(201)
      expect(result[2].id).toBe(202)
    })

    it('retorna array vacío para bloques vacíos', () => {
      expect(buildDefaultExerciseOrder([])).toEqual([])
    })
  })

  describe('applyCustomExerciseOrder', () => {
    it('aplica orden personalizado de ejercicios de rutina', () => {
      const map = buildRoutineExerciseMap(sampleBlocks)
      const order = [
        { id: 202, type: 'routine' },
        { id: 201, type: 'routine' },
      ]
      const result = applyCustomExerciseOrder(order, map, [])
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(202)
      expect(result[1].id).toBe(201)
    })

    it('incluye ejercicios extra', () => {
      const map = buildRoutineExerciseMap(sampleBlocks)
      const extraExercises = [
        { id: 'extra-1', exercise: { name: 'Curl' } },
      ]
      const order = [
        { id: 201, type: 'routine' },
        { id: 'extra-1', type: 'extra' },
      ]
      const result = applyCustomExerciseOrder(order, map, extraExercises)
      expect(result).toHaveLength(2)
      expect(result[1].id).toBe('extra-1')
      expect(result[1].blockName).toBe('Añadido')
    })

    it('filtra elementos no encontrados', () => {
      const map = buildRoutineExerciseMap(sampleBlocks)
      const order = [
        { id: 201, type: 'routine' },
        { id: 999, type: 'routine' },
      ]
      const result = applyCustomExerciseOrder(order, map, [])
      expect(result).toHaveLength(1)
    })
  })

  describe('hasCustomOrderChanged', () => {
    it('retorna true si hay ejercicios extra', () => {
      expect(hasCustomOrderChanged([], [], true)).toBe(true)
    })

    it('retorna true si longitudes difieren', () => {
      const flat = [{ id: 1 }, { id: 2 }]
      const defaultOrder = [{ id: 1 }]
      expect(hasCustomOrderChanged(flat, defaultOrder, false)).toBe(true)
    })

    it('retorna true si orden difiere', () => {
      const flat = [{ id: 2 }, { id: 1 }]
      const defaultOrder = [{ id: 1 }, { id: 2 }]
      expect(hasCustomOrderChanged(flat, defaultOrder, false)).toBe(true)
    })

    it('retorna false si orden es igual', () => {
      const flat = [{ id: 1 }, { id: 2 }]
      const defaultOrder = [{ id: 1 }, { id: 2 }]
      expect(hasCustomOrderChanged(flat, defaultOrder, false)).toBe(false)
    })
  })

  describe('transformWorkoutSessionData', () => {
    it('retorna estructura vacía para blocks null', () => {
      const result = transformWorkoutSessionData(null, [], [])
      expect(result).toEqual({
        exercisesByBlock: [],
        flatExercises: [],
        hasCustomOrder: false,
      })
    })

    it('usa orden por defecto si exerciseOrder está vacío', () => {
      const result = transformWorkoutSessionData(sampleBlocks, [], [])
      expect(result.flatExercises).toHaveLength(3)
      expect(result.hasCustomOrder).toBe(false)
      expect(result.exercisesByBlock).toHaveLength(2)
    })

    it('aplica orden personalizado', () => {
      const customOrder = [
        { id: 202, type: 'routine' },
        { id: 201, type: 'routine' },
        { id: 101, type: 'routine' },
      ]
      const result = transformWorkoutSessionData(sampleBlocks, customOrder, [])
      expect(result.flatExercises[0].id).toBe(202)
      expect(result.hasCustomOrder).toBe(true)
    })

    it('detecta ejercicios extra como orden personalizado', () => {
      const extraExercises = [{ id: 'extra-1', exercise: { name: 'Curl' } }]
      const customOrder = [
        { id: 101, type: 'routine' },
        { id: 201, type: 'routine' },
        { id: 202, type: 'routine' },
        { id: 'extra-1', type: 'extra' },
      ]
      const result = transformWorkoutSessionData(sampleBlocks, customOrder, extraExercises)
      expect(result.hasCustomOrder).toBe(true)
    })
  })

  describe('buildExerciseOrderFromBlocks', () => {
    it('construye orden con blockId', () => {
      const result = buildExerciseOrderFromBlocks(sampleBlocks)
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ id: 101, type: 'routine', blockId: 1 })
      expect(result[1]).toEqual({ id: 201, type: 'routine', blockId: 2 })
    })

    it('retorna array vacío para bloques vacíos', () => {
      expect(buildExerciseOrderFromBlocks([])).toEqual([])
    })
  })
})
