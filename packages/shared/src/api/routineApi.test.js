import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportRoutine, importRoutine, duplicateRoutine } from './routineApi.js'
import { makeQueryMock } from './_testUtils.js'

// Mock del módulo _client para controlar getClient()
vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
}))

import { getClient } from './_client.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// TEST: exportRoutine — conteo de queries (N+1 fix)
// ============================================

describe('exportRoutine', () => {
  it('hace exactamente N+2 queries para una rutina con N días (sin query extra por día)', async () => {
    const fromCalls = []

    // Datos de prueba: 2 días, cada uno con ejercicios
    const fakeRoutine = { name: 'Rutina Test', description: null, goal: null }
    const fakeDays = [
      { id: 'day-1', name: 'Día 1', estimated_duration_min: 60, sort_order: 1 },
      { id: 'day-2', name: 'Día 2', estimated_duration_min: 45, sort_order: 2 },
    ]
    const fakeRoutineExercises = (dayId) => [
      {
        series: 3, reps: '8-12', rir: 2, rest_seconds: 90,
        notes: null, sort_order: 1, is_warmup: false,
        exercise: {
          id: `ex-${dayId}`,
          name: `Ejercicio ${dayId}`,
          measurement_type: 'weight_reps',
          instructions: null,
          muscle_group: { name: 'Pecho' },
        },
      },
    ]
    const fakeExercises = [
      {
        name: 'Ejercicio day-1', measurement_type: 'weight_reps',
        weight_unit: 'kg',
        instructions: null, muscle_group: { name: 'Pecho' },
      },
      {
        name: 'Ejercicio day-2', measurement_type: 'weight_reps',
        weight_unit: 'kg',
        instructions: null, muscle_group: { name: 'Pecho' },
      },
    ]

    // Mock de getClient: registra cada llamada .from() y devuelve datos según tabla
    getClient.mockImplementation(() => ({
      from: (table) => {
        fromCalls.push(table)
        if (table === 'routines') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: fakeRoutine, error: null }),
          }
        }
        if (table === 'routine_days') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: fakeDays, error: null }),
          }
        }
        if (table === 'routine_exercises') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockImplementation(() => {
              return Promise.resolve({ data: fakeRoutineExercises('day-1'), error: null })
            }),
          }
        }
        if (table === 'exercises') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: fakeExercises, error: null }),
          }
        }
        return makeQueryMock({ data: null, error: null })
      },
    }))

    await exportRoutine('routine-123')

    // N = 2 días → esperamos N+3 queries: 1 routines + 1 routine_days + 2 routine_exercises + 1 exercises
    const routinesCount = fromCalls.filter(t => t === 'routines').length
    const routineDaysCount = fromCalls.filter(t => t === 'routine_days').length
    const routineExercisesCount = fromCalls.filter(t => t === 'routine_exercises').length
    const exercisesCount = fromCalls.filter(t => t === 'exercises').length

    expect(routinesCount).toBe(1)
    expect(routineDaysCount).toBe(1) // Solo 1 query de días — NO una por día adicional
    expect(routineExercisesCount).toBe(fakeDays.length) // Una por día (N)
    expect(exercisesCount).toBe(1)

    // Total: 1 + 1 + N + 1 = N+3 (routine + days + N routine_exercises + exercises)
    expect(fromCalls.length).toBe(fakeDays.length + 3)
  })
})

// ============================================
// TEST: importRoutine — crea registros correctos en BD
// ============================================

describe('importRoutine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserta rutina, días y ejercicios con los IDs enlazados correctamente', async () => {
    const insertCalls = {}
    let routineIdCounter = 100
    let dayIdCounter = 200

    const sampleJson = {
      version: 5,
      exportedAt: '2026-01-01T00:00:00.000Z',
      exercises: [
        {
          name_es: 'Press Banca',
          measurement_type: 'weight_reps',
          weight_unit: 'kg',
          instructions: null,
          muscle_group_name: 'Pecho',
        },
      ],
      routine: {
        name: 'Rutina Importada',
        description: 'Descripción',
        goal: 'Fuerza',
        days: [
          {
            name: 'Día 1',
            estimated_duration_min: 60,
            sort_order: 1,
            blocks: [
              {
                name: 'Principal',
                sort_order: 1,
                duration_min: null,
                exercises: [
                  {
                    exercise_name: 'Press Banca',
                    series: 4,
                    reps: '5',
                    rir: 1,
                    rest_seconds: 180,
                    notes: null,
                  },
                ],
              },
            ],
          },
        ],
      },
    }

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (!insertCalls[table]) insertCalls[table] = []

        // Mock para muscle_groups (batch query con .in())
        if (table === 'muscle_groups') {
          const mgChain = {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'mg-1' }, error: null }),
            then: (resolve) => resolve({ data: [{ id: 'mg-1', name: 'Pecho' }], error: null }),
          }
          return mgChain
        }

        // Mock para ejercicios (batch query con .in() + insert individual)
        if (table === 'exercises') {
          const exChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (resolve) => resolve({ data: [], error: null }),
            insert: vi.fn((record) => {
              insertCalls[table].push(record)
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'ex-new-1' }, error: null }),
              }
            }),
          }
          return exChain
        }

        if (table === 'routines') {
          return {
            insert: vi.fn((record) => {
              insertCalls[table].push(record)
              routineIdCounter++
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: routineIdCounter, ...record }, error: null }),
              }
            }),
          }
        }

        if (table === 'routine_days') {
          return {
            insert: vi.fn((record) => {
              insertCalls[table].push(record)
              dayIdCounter++
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: dayIdCounter, ...record }, error: null }),
              }
            }),
          }
        }

        if (table === 'routine_exercises') {
          return {
            insert: vi.fn((record) => {
              insertCalls[table].push(record)
              return Promise.resolve({ data: { id: 're-1' }, error: null })
            }),
          }
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      },
    }))

    const result = await importRoutine(sampleJson, 'user-123', {})

    // Rutina creada con user_id correcto
    expect(insertCalls['routines']).toHaveLength(1)
    expect(insertCalls['routines'][0]).toMatchObject({
      name: 'Rutina Importada',
      user_id: 'user-123',
    })

    // 1 día creado, referenciando la rutina
    expect(insertCalls['routine_days']).toHaveLength(1)
    expect(insertCalls['routine_days'][0]).toMatchObject({
      name: 'Día 1',
      sort_order: 1,
    })
    expect(insertCalls['routine_days'][0].routine_id).toBeDefined()

    // No routine_blocks creados (tabla eliminada)
    expect(insertCalls['routine_blocks']).toBeUndefined()

    // 1 ejercicio de rutina creado directamente con routine_day_id e is_warmup
    expect(insertCalls['routine_exercises']).toHaveLength(1)
    expect(insertCalls['routine_exercises'][0]).toMatchObject({
      series: 4,
      reps: '5',
      sort_order: 1,
      is_warmup: false,
    })
    expect(insertCalls['routine_exercises'][0].routine_day_id).toBeDefined()
    expect(insertCalls['routine_exercises'][0].exercise_id).toBeDefined()

    // Retorna la rutina creada
    expect(result).toBeDefined()
    expect(result.name).toBe('Rutina Importada')
  })
})

// ============================================
// TEST: duplicateRoutine — crea copia con sufijo "(copia)"
// ============================================

describe('duplicateRoutine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crea una copia de la rutina con sufijo "(copia)" en el nombre', async () => {
    const insertedRoutines = []

    // Datos para exportRoutine (fase de lectura)
    const fakeRoutine = { name: 'Rutina Original', description: null, goal: null }
    const fakeDays = [
      { id: 'day-1', name: 'Día 1', estimated_duration_min: 60, sort_order: 1 },
    ]
    const fakeRoutineExercises = [
      {
        series: 3, reps: '10', rir: 2, rest_seconds: 60,
        notes: null, sort_order: 1, is_warmup: false,
        exercise: {
          id: 'ex-1', name: 'Sentadilla', measurement_type: 'weight_reps',
          instructions: null, muscle_group: { name: 'Piernas' },
        },
      },
    ]
    const fakeExercises = [
      {
        name: 'Sentadilla', measurement_type: 'weight_reps',
        weight_unit: 'kg',
        instructions: null, muscle_group: { name: 'Piernas' },
      },
    ]

    let routineIdCounter = 500

    getClient.mockImplementation(() => ({
      from: (table) => {
        // --- Fase exportRoutine: reads ---
        if (table === 'routines') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: fakeRoutine, error: null }),
            insert: vi.fn((record) => {
              insertedRoutines.push(record)
              routineIdCounter++
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: routineIdCounter, ...record }, error: null }),
              }
            }),
          }
        }
        if (table === 'routine_days') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: fakeDays, error: null }),
            insert: vi.fn((record) => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: 'new-day-1', ...record }, error: null }),
            })),
          }
        }
        if (table === 'routine_exercises') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: fakeRoutineExercises, error: null }),
            insert: vi.fn().mockResolvedValue({ data: { id: 're-1' }, error: null }),
          }
        }
        if (table === 'exercises') {
          // Batch query resuelve como thenable; insert crea ejercicio nuevo
          const resolved = Promise.resolve({ data: fakeExercises, error: null })
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ex-1' }, error: null }),
            // Export usa .in() sin .eq(); import usa .eq().in() — ambos terminan en await
            then: resolved.then.bind(resolved),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: 'ex-1' }, error: null }),
            }),
          }
        }
        if (table === 'muscle_groups') {
          const resolved = Promise.resolve({ data: [{ id: 'mg-1', name: 'Piernas' }], error: null })
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'mg-1' }, error: null }),
            then: resolved.then.bind(resolved),
          }
        }
        return makeQueryMock({ data: null, error: null })
      },
    }))

    const result = await duplicateRoutine('routine-1', 'user-1')

    // La nueva rutina debe tener el sufijo "(copia)"
    expect(insertedRoutines).toHaveLength(1)
    expect(insertedRoutines[0].name).toBe('Rutina Original (copia)')
    expect(result).toBeDefined()
    expect(result.name).toBe('Rutina Original (copia)')
  })

  it('usa el nombre personalizado si se proporciona', async () => {
    const insertedRoutines = []

    const fakeRoutine = { name: 'Rutina Original', description: null, goal: null }
    const fakeDays = [{ id: 'day-1', name: 'Día 1', estimated_duration_min: null, sort_order: 1 }]

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (table === 'routines') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: fakeRoutine, error: null }),
            insert: vi.fn((record) => {
              insertedRoutines.push(record)
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 999, ...record }, error: null }),
              }
            }),
          }
        }
        if (table === 'routine_days') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: fakeDays, error: null }),
            insert: vi.fn((record) => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: 'nd-1', ...record }, error: null }),
            })),
          }
        }
        if (table === 'routine_exercises') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'exercises') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return makeQueryMock({ data: null, error: null })
      },
    }))

    const result = await duplicateRoutine('routine-1', 'user-1', 'Mi Copia Personalizada')

    expect(insertedRoutines[0].name).toBe('Mi Copia Personalizada')
    expect(result.name).toBe('Mi Copia Personalizada')
  })
})
