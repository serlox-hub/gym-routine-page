import { describe, it, expect } from 'vitest'
import {
  transformSessionExercises,
  buildSessionExercisesFromBlocks,
  buildSessionExercisesCache,
  buildSessionExercisesFromSession,
  buildRoutineExerciseMap,
  groupExercisesByBlock,
  groupExercisesBySupersetId,
  buildDefaultExerciseOrder,
  transformSessionDetailData,
  buildCompletedSetsMap,
} from './workoutTransforms.js'

describe('workoutTransforms', () => {
  const sampleBlocks = [
    {
      id: 1,
      name: 'Calentamiento',
      is_warmup: true,
      sort_order: 0,
      duration_min: 10,
      routine_exercises: [
        { id: 101, sort_order: 0, exercise: { name: 'Cardio' } },
      ],
    },
    {
      id: 2,
      name: 'Principal',
      is_warmup: false,
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
      is_warmup: false,
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
        notes: 'Nota test',
        superset_group: null,
        is_extra: false,
        is_warmup: false,
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
        notes: null,
        superset_group: null,
        is_extra: false,
        is_warmup: false,
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
          is_warmup: true,
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
          is_warmup: false,
          exercise: { id: 1, name: 'Press' },
          series: 3,
          reps: '10',
        },
        {
          id: 2,
          sort_order: 2,
          superset_group: 1,
          is_warmup: false,
          exercise: { id: 2, name: 'Curl' },
          series: 3,
          reps: '12',
        },
        {
          id: 3,
          sort_order: 3,
          superset_group: 1,
          is_warmup: false,
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
        { id: 2, sort_order: 2, is_warmup: false, exercise: { id: 2, name: 'B' }, series: 3, reps: '10' },
        { id: 1, sort_order: 1, is_warmup: false, exercise: { id: 1, name: 'A' }, series: 3, reps: '10' },
        { id: 3, sort_order: 3, is_warmup: false, exercise: { id: 3, name: 'C' }, series: 3, reps: '10' },
      ]
      const result = transformSessionExercises(unorderedExercises)

      expect(result.flatExercises[0].exercise.name).toBe('A')
      expect(result.flatExercises[1].exercise.name).toBe('B')
      expect(result.flatExercises[2].exercise.name).toBe('C')
    })

    it('marca ejercicios extra correctamente', () => {
      const exercises = [
        { id: 1, sort_order: 1, is_extra: true, is_warmup: false, exercise: { id: 1, name: 'Extra' }, series: 3, reps: '10' },
      ]
      const result = transformSessionExercises(exercises)

      expect(result.flatExercises[0].is_extra).toBe(true)
      expect(result.flatExercises[0].type).toBe('extra')
    })

    it('usa "Principal" como bloque por defecto si is_warmup es false/null', () => {
      const exercises = [
        { id: 1, sort_order: 1, is_warmup: null, exercise: { id: 1, name: 'Test' }, series: 3, reps: '10' },
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
      expect(result[0].is_warmup).toBe(true)
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
        notes: 'Controlar bajada',
        superset_group: null,
        is_extra: false,
        is_warmup: false,
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

  describe('buildSessionExercisesFromSession', () => {
    it('retorna array vacío para null/undefined', () => {
      expect(buildSessionExercisesFromSession(null)).toEqual([])
      expect(buildSessionExercisesFromSession(undefined)).toEqual([])
    })

    it('copia los ejercicios de una sesión al formato del RPC', () => {
      const exercises = [
        {
          sessionExerciseId: 500,
          exercise: { id: 10, name: 'Press banca' },
          series: 4,
          reps: '8-10',
          rir: 2,
          rest_seconds: 120,
          notes: 'Controlar bajada',
          superset_group: null,
          is_extra: false,
          is_warmup: false,
        },
      ]
      const result = buildSessionExercisesFromSession(exercises)

      expect(result).toEqual([
        {
          exercise_id: 10,
          routine_exercise_id: null,
          sort_order: 1,
          series: 4,
          reps: '8-10',
          rir: 2,
          rest_seconds: 120,
          notes: 'Controlar bajada',
          superset_group: null,
          is_extra: false,
          is_warmup: false,
        },
      ])
    })

    it('reasigna sort_order secuencial y omite ejercicios eliminados', () => {
      const exercises = [
        { exercise: { id: 1 }, series: 3, reps: '10', is_warmup: true },
        { exercise: { id: 2, deleted_at: '2026-01-01' }, series: 3, reps: '10' },
        { exercise: { id: 3 }, series: 3, reps: '10', superset_group: 5, is_extra: true },
      ]
      const result = buildSessionExercisesFromSession(exercises)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ exercise_id: 1, sort_order: 1, is_warmup: true })
      expect(result[1]).toMatchObject({ exercise_id: 3, sort_order: 2, superset_group: 5, is_extra: true })
    })
  })

  describe('transformSessionDetailData', () => {
    it('retorna null si no hay sesión', () => {
      expect(transformSessionDetailData(null)).toBe(null)
    })

    it('convierte session_exercises en exercises ordenados con sus sets', () => {
      const raw = {
        id: 1,
        started_at: '2026-07-12T10:00:00Z',
        session_exercises: [
          {
            id: 20,
            sort_order: 2,
            series: 3,
            reps: '10',
            rir: 1,
            rest_seconds: 90,
            notes: 'ok',
            superset_group: 4,
            is_extra: true,
            is_warmup: false,
            exercise: { id: 2, name: 'Fondos' },
            completed_sets: [
              { set_number: 2, weight: 20 },
              { set_number: 1, weight: 10 },
            ],
          },
          {
            id: 10,
            sort_order: 1,
            series: 2,
            reps: '12',
            exercise: { id: 1, name: 'Press' },
            completed_sets: [],
          },
        ],
      }

      const result = transformSessionDetailData(raw)

      // Ordenado por sort_order
      expect(result.exercises.map(e => e.sessionExerciseId)).toEqual([10, 20])
      // Sets ordenados por set_number
      expect(result.exercises[1].sets.map(s => s.set_number)).toEqual([1, 2])
      // Campos copiados para poder repetir el entrenamiento
      expect(result.exercises[0]).toMatchObject({
        series: 2,
        reps: '12',
        rir: null,
        rest_seconds: null,
        notes: null,
        superset_group: null,
        is_warmup: false,
      })
      expect(result.exercises[1]).toMatchObject({
        rir: 1,
        rest_seconds: 90,
        notes: 'ok',
        superset_group: 4,
        is_extra: true,
      })
      // session_exercises eliminado del resultado, resto preservado
      expect(result.session_exercises).toBeUndefined()
      expect(result.started_at).toBe('2026-07-12T10:00:00Z')
    })
  })

  describe('buildSessionExercisesCache', () => {
    const blocks = [
      {
        name: 'Principal',
        is_warmup: false,
        routine_exercises: [
          { id: 201, sort_order: 1, series: 4, reps: '8', exercise: { id: 1, name: 'Press banca', gif_key: 'bench-press', is_system: true } },
          { id: 202, sort_order: 2, exercise: { id: 2, name: 'Sentadilla' } },
        ],
      },
    ]
    const sessionExercises = [
      { id: 10, exercise_id: 1, sort_order: 1 },
      { id: 11, exercise_id: 2, sort_order: 2 },
    ]

    it('propaga gif_key del ejercicio de la rutina para que el GIF se vea en la sesión recién iniciada', () => {
      const result = buildSessionExercisesCache(sessionExercises, blocks)
      expect(result[0].exercise.gif_key).toBe('bench-press')
    })

    it('usa null (no undefined) cuando el ejercicio no trae gif_key, igualando la forma de fetchSessionExercises', () => {
      const result = buildSessionExercisesCache(sessionExercises, blocks)
      expect(result[1].exercise.gif_key).toBeNull()
    })

    it('propaga is_system y lo normaliza a null cuando falta, igualando la forma de fetchSessionExercises', () => {
      const result = buildSessionExercisesCache(sessionExercises, blocks)
      expect(result[0].exercise.is_system).toBe(true)
      expect(result[1].exercise.is_system).toBeNull()
    })

    // Fija el set de claves del objeto exercise: si fetchSessionExercises (sessionExercisesApi.js)
    // gana/pierde un campo y no se replica aquí, este test rompe (era la causa del bug del GIF).
    it('produce exactamente las mismas claves de exercise que el select de fetchSessionExercises', () => {
      const result = buildSessionExercisesCache(sessionExercises, blocks)
      expect(Object.keys(result[0].exercise).sort()).toEqual([
        'gif_key', 'id', 'instructions', 'is_system', 'measurement_type', 'muscle_group', 'name', 'name_en',
      ])
    })

    it('aplica defaults y routine_exercise_id null cuando el session_exercise no casa con ningún bloque', () => {
      const result = buildSessionExercisesCache([{ id: 99, exercise_id: 7, sort_order: 99 }], blocks)
      expect(result[0]).toMatchObject({
        routine_exercise_id: null,
        series: 3,
        reps: '10',
        is_warmup: false,
        is_extra: false,
      })
      expect(result[0].exercise.gif_key).toBeNull()
    })

    it('copia los campos de la rutina y marca is_warmup en un bloque de calentamiento', () => {
      const warmupBlocks = [
        {
          name: 'Calentamiento',
          is_warmup: true,
          routine_exercises: [
            { id: 301, sort_order: 1, series: 2, reps: '15', rir: 3, rest_seconds: 60, notes: 'suave', superset_group: 5, exercise: { id: 9, name: 'Movilidad' } },
          ],
        },
      ]
      const result = buildSessionExercisesCache([{ id: 30, exercise_id: 9, sort_order: 1 }], warmupBlocks)
      expect(result[0]).toMatchObject({
        routine_exercise_id: 301,
        series: 2,
        reps: '15',
        rir: 3,
        rest_seconds: 60,
        notes: 'suave',
        superset_group: 5,
        is_warmup: true,
        is_extra: false,
      })
    })
  })

  describe('buildCompletedSetsMap', () => {
    it('mapea filas snake_case de la BD a formato store camelCase con clave compuesta', () => {
      const result = buildCompletedSetsMap([
        {
          session_exercise_id: 'se-1',
          set_number: 2,
          weight: 80,
          reps_completed: 8,
          time_seconds: null,
          distance_meters: null,
          pace_seconds: null,
          level: null,
          calories_burned: null,
          rir_actual: 1,
          notes: 'ok',
          video_url: null,
          set_type: 'dropset',
        },
      ])
      expect(result['se-1-2']).toMatchObject({
        sessionExerciseId: 'se-1',
        setNumber: 2,
        weight: 80,
        repsCompleted: 8,
        rirActual: 1,
        notes: 'ok',
        setType: 'dropset',
      })
    })

    // issue #11: la restauración debe recuperar level y calorías (cardio LEVEL_*/CALORIES)
    it('recupera level y caloriesBurned (tipo LEVEL_CALORIES)', () => {
      const result = buildCompletedSetsMap([
        { session_exercise_id: 'se-3', set_number: 1, level: 8, calories_burned: 120 },
      ])
      expect(result['se-3-1'].level).toBe(8)
      expect(result['se-3-1'].caloriesBurned).toBe(120)
    })

    it('set_type ausente cae a "normal" y una lista vacía/undefined da {}', () => {
      const result = buildCompletedSetsMap([
        { session_exercise_id: 'se-4', set_number: 1 },
      ])
      expect(result['se-4-1'].setType).toBe('normal')
      expect(buildCompletedSetsMap([])).toEqual({})
      expect(buildCompletedSetsMap(undefined)).toEqual({})
    })
  })
})
