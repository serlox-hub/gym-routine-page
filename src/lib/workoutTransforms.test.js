import { describe, it, expect } from 'vitest'
import {
  transformSessionExercises,
  buildSessionExercisesFromBlocks,
  buildRoutineExerciseMap,
  groupExercisesByBlock,
  groupExercisesBySupersetId,
  buildDefaultExerciseOrder,
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

  // ============================================
  // SESSION EXERCISES (nueva tabla)
  // ============================================

  describe('transformSessionExercises', () => {
    const sampleSessionExercises = [
      {
        id: 1,
        exercise_id: 10,
        sort_order: 1,
        series: 3,
        reps: '10',
        rir: 2,
        rest_seconds: 90,
        tempo: '3010',
        notes: 'Nota test',
        superset_group: null,
        is_extra: false,
        block_name: 'Principal',
        exercise: { id: 10, name: 'Press banca', measurement_type: 'weight_reps' },
      },
      {
        id: 2,
        exercise_id: 11,
        sort_order: 2,
        series: 3,
        reps: '12',
        rir: 1,
        rest_seconds: 60,
        tempo: null,
        notes: null,
        superset_group: null,
        is_extra: false,
        block_name: 'Principal',
        exercise: { id: 11, name: 'Press inclinado', measurement_type: 'weight_reps' },
      },
    ]

    it('retorna estructura vacía para null', () => {
      const result = transformSessionExercises(null)
      expect(result).toEqual({ exercisesByBlock: [], flatExercises: [] })
    })

    it('retorna estructura vacía para array vacío', () => {
      const result = transformSessionExercises([])
      expect(result).toEqual({ exercisesByBlock: [], flatExercises: [] })
    })

    it('transforma ejercicios individuales correctamente', () => {
      const result = transformSessionExercises(sampleSessionExercises)

      expect(result.flatExercises).toHaveLength(2)
      expect(result.flatExercises[0].sessionExerciseId).toBe(1)
      expect(result.flatExercises[0].exercise.name).toBe('Press banca')
      expect(result.flatExercises[0].series).toBe(3)
      expect(result.flatExercises[0].reps).toBe('10')
    })

    it('agrupa ejercicios por bloque', () => {
      const result = transformSessionExercises(sampleSessionExercises)

      expect(result.exercisesByBlock).toHaveLength(1)
      expect(result.exercisesByBlock[0].blockName).toBe('Principal')
      expect(result.exercisesByBlock[0].exerciseGroups).toHaveLength(2)
    })

    it('marca bloques de calentamiento correctamente', () => {
      const warmupExercises = [
        {
          id: 1,
          sort_order: 1,
          block_name: 'Calentamiento',
          exercise: { id: 1, name: 'Cardio' },
          series: 1,
          reps: '5min',
        },
      ]
      const result = transformSessionExercises(warmupExercises)

      expect(result.exercisesByBlock[0].isWarmup).toBe(true)
      expect(result.flatExercises[0].isWarmup).toBe(true)
    })

    it('agrupa supersets correctamente', () => {
      const exercisesWithSuperset = [
        {
          id: 1,
          sort_order: 1,
          superset_group: null,
          block_name: 'Principal',
          exercise: { id: 1, name: 'Press' },
          series: 3,
          reps: '10',
        },
        {
          id: 2,
          sort_order: 2,
          superset_group: 1,
          block_name: 'Principal',
          exercise: { id: 2, name: 'Curl' },
          series: 3,
          reps: '12',
        },
        {
          id: 3,
          sort_order: 3,
          superset_group: 1,
          block_name: 'Principal',
          exercise: { id: 3, name: 'Triceps' },
          series: 3,
          reps: '12',
        },
      ]
      const result = transformSessionExercises(exercisesWithSuperset)

      expect(result.exercisesByBlock[0].exerciseGroups).toHaveLength(2)
      expect(result.exercisesByBlock[0].exerciseGroups[0].type).toBe('individual')
      expect(result.exercisesByBlock[0].exerciseGroups[1].type).toBe('superset')
      expect(result.exercisesByBlock[0].exerciseGroups[1].exercises).toHaveLength(2)
    })

    it('mantiene orden por sort_order', () => {
      const unorderedExercises = [
        { id: 2, sort_order: 2, block_name: 'Principal', exercise: { id: 2, name: 'B' }, series: 3, reps: '10' },
        { id: 1, sort_order: 1, block_name: 'Principal', exercise: { id: 1, name: 'A' }, series: 3, reps: '10' },
        { id: 3, sort_order: 3, block_name: 'Principal', exercise: { id: 3, name: 'C' }, series: 3, reps: '10' },
      ]
      const result = transformSessionExercises(unorderedExercises)

      expect(result.flatExercises[0].exercise.name).toBe('A')
      expect(result.flatExercises[1].exercise.name).toBe('B')
      expect(result.flatExercises[2].exercise.name).toBe('C')
    })

    it('marca ejercicios extra correctamente', () => {
      const exercises = [
        { id: 1, sort_order: 1, is_extra: true, block_name: 'Añadido', exercise: { id: 1, name: 'Extra' }, series: 3, reps: '10' },
      ]
      const result = transformSessionExercises(exercises)

      expect(result.flatExercises[0].is_extra).toBe(true)
      expect(result.flatExercises[0].type).toBe('extra')
    })

    it('usa "Principal" como bloque por defecto si block_name es null', () => {
      const exercises = [
        { id: 1, sort_order: 1, block_name: null, exercise: { id: 1, name: 'Test' }, series: 3, reps: '10' },
      ]
      const result = transformSessionExercises(exercises)

      expect(result.flatExercises[0].blockName).toBe('Principal')
    })
  })

  describe('buildSessionExercisesFromBlocks', () => {
    it('retorna array vacío para null', () => {
      expect(buildSessionExercisesFromBlocks(null)).toEqual([])
    })

    it('retorna array vacío para undefined', () => {
      expect(buildSessionExercisesFromBlocks(undefined)).toEqual([])
    })

    it('construye session_exercises desde bloques', () => {
      const result = buildSessionExercisesFromBlocks(sampleBlocks)

      expect(result).toHaveLength(3)
      expect(result[0].exercise_id).toBe(undefined) // sampleBlocks no tiene exercise_id
      expect(result[0].block_name).toBe('Calentamiento')
      expect(result[0].is_extra).toBe(false)
    })

    it('asigna sort_order secuencial', () => {
      const result = buildSessionExercisesFromBlocks(sampleBlocks)

      expect(result[0].sort_order).toBe(1)
      expect(result[1].sort_order).toBe(2)
      expect(result[2].sort_order).toBe(3)
    })

    it('copia todos los campos de routine_exercises', () => {
      const blocksWithFullData = [
        {
          id: 1,
          name: 'Principal',
          routine_exercises: [
            {
              id: 100,
              exercise_id: 10,
              sort_order: 0,
              series: 4,
              reps: '8-10',
              rir: 2,
              rest_seconds: 120,
              tempo: '3011',
              notes: 'Controlar bajada',
              superset_group: null,
            },
          ],
        },
      ]
      const result = buildSessionExercisesFromBlocks(blocksWithFullData)

      expect(result[0]).toEqual({
        exercise_id: 10,
        routine_exercise_id: 100,
        sort_order: 1,
        series: 4,
        reps: '8-10',
        rir: 2,
        rest_seconds: 120,
        tempo: '3011',
        notes: 'Controlar bajada',
        superset_group: null,
        is_extra: false,
        block_name: 'Principal',
      })
    })

    it('preserva superset_group', () => {
      const blocksWithSuperset = [
        {
          id: 1,
          name: 'Principal',
          routine_exercises: [
            { id: 1, exercise_id: 1, sort_order: 0, series: 3, reps: '10', superset_group: 1 },
            { id: 2, exercise_id: 2, sort_order: 1, series: 3, reps: '10', superset_group: 1 },
          ],
        },
      ]
      const result = buildSessionExercisesFromBlocks(blocksWithSuperset)

      expect(result[0].superset_group).toBe(1)
      expect(result[1].superset_group).toBe(1)
    })

    it('ordena ejercicios dentro del bloque por sort_order', () => {
      const blocksUnordered = [
        {
          id: 1,
          name: 'Principal',
          routine_exercises: [
            { id: 2, exercise_id: 2, sort_order: 1, series: 3, reps: '10' },
            { id: 1, exercise_id: 1, sort_order: 0, series: 3, reps: '10' },
          ],
        },
      ]
      const result = buildSessionExercisesFromBlocks(blocksUnordered)

      expect(result[0].exercise_id).toBe(1)
      expect(result[1].exercise_id).toBe(2)
    })
  })
})
