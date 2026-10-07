import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildRoutineExport, exportRoutine, importRoutine, duplicateRoutine } from './routineApi.js'
// La versión se importa del módulo que la define (el barrel de routineApi no la re-exporta:
// nadie fuera del import/export necesita el número).
import { ROUTINE_EXPORT_VERSION } from './routineIOApi.js'
import { makeQueryMock } from './_testUtils.js'
import { formatRoutineAsText } from '../lib/routineTextFormat.js'

// Mock del módulo _client para controlar getClient()
vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
}))

import { getClient } from './_client.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// TEST: exportRoutine / buildRoutineExport — one RPC, one builder
// ============================================

// Rows in the `routine_export_rows` shape (migration 068)
function exportRows(overrides = {}) {
  return {
    routine: { name: 'Rutina Test', description: null },
    days: [
      { id: 2, name: 'Día 2', estimated_duration_min: 45, sort_order: 2 },
      { id: 1, name: 'Día 1', estimated_duration_min: 60, sort_order: 1 },
    ],
    routine_exercises: [
      { routine_day_id: 1, exercise_id: 10, series: 3, target_field: 'reps', reps: '8-12', level: null, rir: 2, rest_seconds: 90, notes: null, sort_order: 2, is_warmup: false, superset_group: 1 },
      { routine_day_id: 1, exercise_id: 11, series: 3, target_field: 'reps', reps: '8-12', level: null, rir: 2, rest_seconds: 90, notes: 'Agarre cerrado', sort_order: 3, is_warmup: false, superset_group: 1 },
      { routine_day_id: 1, exercise_id: 12, series: 2, target_field: 'time', reps: '5min', level: 4, rir: null, rest_seconds: null, notes: null, sort_order: 1, is_warmup: true, superset_group: null },
      { routine_day_id: 2, exercise_id: 10, series: 4, target_field: 'reps', reps: '5', level: null, rir: 1, rest_seconds: 180, notes: null, sort_order: 1, is_warmup: false, superset_group: null },
    ],
    exercises: [
      { id: 10, name_es: 'Press banca', name_en: 'Bench Press', tracked_fields: ['weight', 'reps'], distance_unit: 'm', instructions: null, muscle_group_name_es: 'Pecho' },
      { id: 11, name_es: 'Remo', name_en: null, tracked_fields: ['weight', 'reps'], distance_unit: 'm', instructions: 'Espalda recta', muscle_group_name_es: 'Espalda' },
      { id: 12, name_es: 'Bici', name_en: 'Bike', tracked_fields: ['level', 'time'], distance_unit: 'km', instructions: null, muscle_group_name_es: null },
    ],
    ...overrides,
  }
}

const EXPECTED_EXPORT = {
  version: ROUTINE_EXPORT_VERSION,
  exercises: [
    { name_es: 'Bici', name_en: 'Bike', tracked_fields: ['level', 'time'], distance_unit: 'km', instructions: null, muscle_group_name: null },
    { name_es: 'Press banca', name_en: 'Bench Press', tracked_fields: ['weight', 'reps'], distance_unit: 'm', instructions: null, muscle_group_name: 'Pecho' },
    { name_es: 'Remo', name_en: null, tracked_fields: ['weight', 'reps'], distance_unit: 'm', instructions: 'Espalda recta', muscle_group_name: 'Espalda' },
  ],
  routine: {
    name: 'Rutina Test',
    description: null,
    days: [
      {
        name: 'Día 1', estimated_duration_min: 60, sort_order: 1,
        blocks: [
          { name: 'Calentamiento', sort_order: 0, duration_min: null, exercises: [
            { exercise_name: 'Bici', series: 2, target_field: 'time', reps: '5min', level: 4, rir: null, rest_seconds: null, notes: null, superset_group: null },
          ] },
          { name: 'Principal', sort_order: 1, duration_min: null, exercises: [
            { exercise_name: 'Press banca', series: 3, target_field: 'reps', reps: '8-12', level: null, rir: 2, rest_seconds: 90, notes: null, superset_group: 1 },
            { exercise_name: 'Remo', series: 3, target_field: 'reps', reps: '8-12', level: null, rir: 2, rest_seconds: 90, notes: 'Agarre cerrado', superset_group: 1 },
          ] },
        ],
      },
      {
        name: 'Día 2', estimated_duration_min: 45, sort_order: 2,
        blocks: [
          { name: 'Principal', sort_order: 1, duration_min: null, exercises: [
            { exercise_name: 'Press banca', series: 4, target_field: 'reps', reps: '5', level: null, rir: 1, rest_seconds: 180, notes: null, superset_group: null },
          ] },
        ],
      },
    ],
  },
}

describe('buildRoutineExport', () => {
  it('builds the export JSON: days in order, warmup block first, every prescription field', () => {
    const { exportedAt, ...exported } = buildRoutineExport(exportRows())
    expect(typeof exportedAt).toBe('string')
    expect(exported).toEqual(EXPECTED_EXPORT)
  })

  it('lists each exercise once even when several days use it, and only the ones used', () => {
    const rows = exportRows()
    rows.exercises.push({ id: 99, name_es: 'Sin usar', name_en: null, tracked_fields: ['reps'], distance_unit: 'm', instructions: null, muscle_group_name_es: null })
    const names = buildRoutineExport(rows).exercises.map(e => e.name_es)
    expect(names).toEqual(['Bici', 'Press banca', 'Remo'])
  })

  it('puts a day without sort_order last, as the database orders it', () => {
    const rows = exportRows()
    rows.days.push({ id: 3, name: 'Sin orden', estimated_duration_min: null, sort_order: null })
    expect(buildRoutineExport(rows).routine.days.map(d => d.name)).toEqual(['Día 1', 'Día 2', 'Sin orden'])
  })

  it('keeps a day without exercises, with no blocks', () => {
    const exported = buildRoutineExport(exportRows({ routine_exercises: [] }))
    expect(exported.routine.days.map(d => d.blocks)).toEqual([[], []])
    expect(exported.exercises).toEqual([])
  })

  it('the catalog carries name_es and tracked_fields, which formatRoutineAsText pairs with the blocks', () => {
    const exported = buildRoutineExport(exportRows({
      routine_exercises: [{ routine_day_id: 1, exercise_id: 12, series: 3, target_field: 'time', reps: '20min', level: 8, rir: 4, rest_seconds: null, notes: null, sort_order: 1, is_warmup: false, superset_group: null }],
    }))
    // Without tracked_fields in the catalog the text falls back to the RIR scale: "@4" instead of "Muy duro"
    expect(formatRoutineAsText(exported)).toContain('Muy duro')
  })
})

describe('exportRoutine', () => {
  it('reads every row with one RPC and returns the same export as before', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: exportRows(), error: null })
    getClient.mockReturnValue({ rpc, from: vi.fn() })

    const { exportedAt, ...exported } = await exportRoutine('123')

    expect(rpc).toHaveBeenCalledWith('routine_export_rows', { p_routine_id: 123 })
    expect(getClient().from).not.toHaveBeenCalled()
    expect(exportedAt).toBeDefined()
    expect(exported).toEqual(EXPECTED_EXPORT)
  })

  it('throws when the routine is not visible to the caller (the RPC returns null)', async () => {
    getClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: null }) })
    await expect(exportRoutine(5)).rejects.toThrow()
  })

  it('throws the RPC error', async () => {
    const error = { message: 'boom' }
    getClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error }) })
    await expect(exportRoutine(5)).rejects.toBe(error)
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
      version: 7,
      exportedAt: '2026-01-01T00:00:00.000Z',
      exercises: [
        {
          name_es: 'Press Banca',
          tracked_fields: ['weight', 'reps'],
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

        // Mock para ejercicios (lecturas sistema/custom con .eq().is() + insert individual)
        if (table === 'exercises') {
          const exChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (resolve) => resolve({ data: [], error: null }),
            insert: vi.fn((record) => {
              insertCalls[table].push(...(Array.isArray(record) ? record : [record]))
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
              insertCalls[table].push(...(Array.isArray(record) ? record : [record]))
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
              insertCalls[table].push(...(Array.isArray(record) ? record : [record]))
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
              insertCalls[table].push(...(Array.isArray(record) ? record : [record]))
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

  // Retrocompatibilidad declarada como invariante en docs/routine-io.md: un JSON exportado antes
  // de v7 trae `measurement_type` (uno de los 12 tipos cerrados) y tiene que seguir importándose.
  // Cubre el cableado de importedTrackedFields(); el mapa en sí lo testea measurementFields.test.js.
  it('importa un export v6 con measurement_type y lo traduce a campos', async () => {
    const insertCalls = {}
    const legacyJson = {
      version: 6,
      exercises: [
        { name_es: 'Cinta', name_en: 'Treadmill', measurement_type: 'level_time', muscle_group_name: 'Cardio' },
      ],
      routine: {
        name: 'R', description: null,
        days: [
          { name: 'D1', sort_order: 0, blocks: [
            { name: 'Principal', sort_order: 1, exercises: [
              { exercise_name: 'Cinta', series: 3, reps: '20min' },
            ] },
          ] },
        ],
      },
    }

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (!insertCalls[table]) insertCalls[table] = []
        if (table === 'muscle_groups') {
          return {
            select: vi.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: [{ id: 'mg-cardio', name_es: 'Cardio' }], error: null }),
          }
        }
        if (table === 'exercises') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            // Catálogo vacío → no hay match, así que crea un custom y ahí se ve qué campos escribe
            then: (resolve) => resolve({ data: [], error: null }),
            insert: vi.fn((record) => {
              insertCalls[table].push(record)
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'ex-cinta' }, error: null }),
              }
            }),
          }
        }
        if (table === 'routines' || table === 'routine_days') {
          return {
            insert: vi.fn((record) => {
              insertCalls[table].push(record)
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: `${table}-1`, ...record }, error: null }),
              }
            }),
          }
        }
        return {
          insert: vi.fn((record) => {
            insertCalls[table].push(record)
            return Promise.resolve({ data: null, error: null })
          }),
        }
      },
    }))

    await importRoutine(legacyJson, 'user-123', {})

    expect(insertCalls['exercises']).toHaveLength(1)
    expect(insertCalls['exercises'][0].tracked_fields).toEqual(['level', 'time'])
    expect(insertCalls['exercises'][0].measurement_type).toBeUndefined()
  })

  // Retrocompatibilidad del objetivo (issue #28): v8 trae `target_field`; en un JSON anterior el
  // objetivo era texto libre sin campo y se deriva de lo que mide el ejercicio, igual que hizo el
  // backfill de la migración 056.
  it.each([
    ['v8 respeta el campo objetivo del JSON', 8, 'time', 'time'],
    ['v7 lo deriva de tracked_fields', 7, undefined, 'distance'],
  ])('%s', async (_name, version, exportedTargetField, expected) => {
    const insertCalls = {}
    const json = {
      version,
      // Bici: nivel × distancia × tiempo. Derivado cae en distancia, pero se puede prescribir tiempo.
      exercises: [
        { name_es: 'Bici estática', tracked_fields: ['level', 'distance', 'time'], muscle_group_name: 'Cardio' },
      ],
      routine: {
        name: 'R', description: null,
        days: [
          { name: 'D1', sort_order: 0, blocks: [
            { name: 'Principal', sort_order: 1, exercises: [
              { exercise_name: 'Bici estática', series: 1, reps: '20min', target_field: exportedTargetField, level: 8 },
            ] },
          ] },
        ],
      },
    }

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (!insertCalls[table]) insertCalls[table] = []
        if (table === 'exercises') {
          const p = Promise.resolve({ data: [], error: null })
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            then: p.then.bind(p),
            insert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ex-bike' }, error: null }) })),
          }
        }
        if (table === 'muscle_groups') {
          const p = Promise.resolve({ data: [{ id: 'mg-cardio', name_es: 'Cardio' }], error: null })
          return { select: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        if (table === 'routines' || table === 'routine_days') {
          return { insert: vi.fn((record) => { insertCalls[table].push(record); return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `${table}-1`, ...record }, error: null }) } }) }
        }
        return { insert: vi.fn((record) => { insertCalls[table].push(...(Array.isArray(record) ? record : [record])); return Promise.resolve({ data: null, error: null }) }) }
      },
    }))

    await importRoutine(json, 'user-1', {})

    expect(insertCalls['routine_exercises'][0]).toMatchObject({ target_field: expected, reps: '20min', level: 8 })
  })

  // La unidad de distancia viaja desde v9. Un JSON anterior no dice nada de ella y el ejercicio
  // nace en metros, que es lo que la app hacía antes de cablearla (issue #24).
  it.each([
    ['v9 respeta la unidad del JSON', 'km', 'km'],
    ['un JSON sin unidad crea el ejercicio en metros', undefined, 'm'],
  ])('%s', async (_name, exportedUnit, expected) => {
    const exerciseInserts = []
    const json = {
      version: exportedUnit ? 9 : 8,
      exercises: [
        { name_es: 'Cinta de correr', tracked_fields: ['distance', 'time'], distance_unit: exportedUnit, muscle_group_name: 'Cardio' },
      ],
      routine: {
        name: 'R', description: null,
        days: [
          { name: 'D1', sort_order: 0, blocks: [
            { name: 'Principal', sort_order: 1, exercises: [
              { exercise_name: 'Cinta de correr', series: 1, reps: '5km', target_field: 'distance' },
            ] },
          ] },
        ],
      },
    }

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (table === 'exercises') {
          const p = Promise.resolve({ data: [], error: null })
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            then: p.then.bind(p),
            insert: vi.fn((record) => {
              exerciseInserts.push(record)
              return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ex-run' }, error: null }) }
            }),
          }
        }
        if (table === 'muscle_groups') {
          const p = Promise.resolve({ data: [{ id: 'mg-cardio', name_es: 'Cardio' }], error: null })
          return { select: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        if (table === 'routines' || table === 'routine_days') {
          return { insert: vi.fn((record) => ({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `${table}-1`, ...record }, error: null }) })) }
        }
        return { insert: vi.fn(() => Promise.resolve({ data: null, error: null })) }
      },
    }))

    await importRoutine(json, 'user-1', {})

    expect(exerciseInserts).toHaveLength(1)
    expect(exerciseInserts[0].distance_unit).toBe(expected)
  })

  // Reimportar CON "actualizar ejercicios" sobre un custom ya existente: la unidad solo se pisa si
  // el JSON la declara. Un export v8 no dice nada de ella, y escribir el default 'm' borraría el
  // 'km' que el usuario hubiera elegido a mano en ese ejercicio.
  it.each([
    ['el JSON v9 la declara y se escribe', 'km', { distance_unit: 'km' }],
    ['el JSON v8 no la trae y la columna ni se toca', undefined, {}],
  ])('update de un ejercicio propio: %s', async (_name, exportedUnit, expectedUnitFields) => {
    const updateCalls = []
    const customRows = [{ id: 'ex-custom', name_es: 'Cinta de casa', name_en: null }]
    const json = {
      version: exportedUnit ? 9 : 8,
      exercises: [
        { name_es: 'Cinta de casa', tracked_fields: ['distance', 'time'], distance_unit: exportedUnit, muscle_group_name: 'Cardio', instructions: 'Trota' },
      ],
      routine: {
        name: 'R', description: null,
        days: [
          { name: 'D1', sort_order: 0, blocks: [
            { name: 'Principal', sort_order: 1, exercises: [
              { exercise_name: 'Cinta de casa', series: 1, reps: '5km', target_field: 'distance' },
            ] },
          ] },
        ],
      },
    }

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (table === 'exercises') {
          // Las dos lecturas comparten cadena: la de customs es la que filtra por user_id.
          let isCustomQuery = false
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn((column) => { if (column === 'user_id') isCustomQuery = true; return chain }),
            is: vi.fn(() => chain),
            then: (resolve) => resolve({ data: isCustomQuery ? customRows : [], error: null }),
            update: vi.fn((record) => {
              updateCalls.push(record)
              return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
            }),
            insert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ex-nuevo' }, error: null }) })),
          }
          return chain
        }
        if (table === 'muscle_groups') {
          const p = Promise.resolve({ data: [{ id: 'mg-cardio', name_es: 'Cardio' }], error: null })
          return { select: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        if (table === 'routines' || table === 'routine_days') {
          return { insert: vi.fn((record) => ({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `${table}-1`, ...record }, error: null }) })) }
        }
        return { insert: vi.fn(() => Promise.resolve({ data: null, error: null })) }
      },
    }))

    await importRoutine(json, 'user-1', { updateExercises: true })

    // Se actualiza el custom que casó, no se crea uno nuevo
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]).toMatchObject({ tracked_fields: ['distance', 'time'], ...expectedUnitFields })
    expect('distance_unit' in updateCalls[0]).toBe(exportedUnit !== undefined)
  })

  // A rejected update (RLS, a CHECK) used to be swallowed: the import went on and left a routine
  // pointing at an exercise whose definition was never rewritten. It must abort before any
  // routine row exists, like the insert branch does.
  it('aborts with the update error and creates no routine when rewriting an own exercise fails', async () => {
    const updateError = { code: '42501', message: 'permission denied for table exercises' }
    const insertedTables = []
    const customRows = [{ id: 'ex-custom', name_es: 'Cinta de casa', name_en: null }]

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (table === 'exercises') {
          let isCustomQuery = false
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn((column) => { if (column === 'user_id') isCustomQuery = true; return chain }),
            is: vi.fn(() => chain),
            then: (resolve) => resolve({ data: isCustomQuery ? customRows : [], error: null }),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: updateError }) })),
          }
          return chain
        }
        if (table === 'muscle_groups') {
          const p = Promise.resolve({ data: [], error: null })
          return { select: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        return { insert: vi.fn(() => { insertedTables.push(table); return Promise.resolve({ data: null, error: null }) }) }
      },
    }))

    await expect(importRoutine({
      version: ROUTINE_EXPORT_VERSION,
      exercises: [{ name_es: 'Cinta de casa', tracked_fields: ['distance', 'time'] }],
      routine: {
        name: 'R', description: null,
        days: [
          { name: 'D1', sort_order: 0, blocks: [
            { name: 'Principal', sort_order: 1, exercises: [{ exercise_name: 'Cinta de casa', series: 1, reps: '5km' }] },
          ] },
        ],
      },
    }, 'user-1', { updateExercises: true })).rejects.toBe(updateError)

    expect(insertedTables).toEqual([])
  })

  // A failed catalog read used to look like an empty catalog: every exercise in the JSON was then
  // created as a custom duplicate, with no GIF and no muscle group (#159). It must abort before
  // anything is written, whichever of the two reads failed.
  it.each([
    ['the system catalog', false],
    ['the user\'s own exercises', true],
  ])('aborts with the read error and writes nothing when reading %s fails', async (_name, failCustomRead) => {
    const readError = { code: '57014', message: 'canceling statement due to statement timeout' }
    const insertedTables = []

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (table === 'exercises') {
          let isCustomQuery = false
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn((column) => { if (column === 'user_id') isCustomQuery = true; return chain }),
            is: vi.fn(() => chain),
            then: (resolve) => resolve(isCustomQuery === failCustomRead
              ? { data: null, error: readError }
              : { data: [], error: null }),
            insert: vi.fn(() => {
              insertedTables.push(table)
              return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ex-new' }, error: null }) }
            }),
          }
          return chain
        }
        if (table === 'muscle_groups') {
          const p = Promise.resolve({ data: [], error: null })
          return { select: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        return {
          insert: vi.fn(() => {
            insertedTables.push(table)
            return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `${table}-1` }, error: null }), then: (resolve) => resolve({ data: null, error: null }) }
          }),
        }
      },
    }))

    await expect(importRoutine({
      version: ROUTINE_EXPORT_VERSION,
      // Unmatched against an empty catalog: if the failed read were swallowed, this exercise would
      // be inserted, followed by the routine, its day and its row.
      exercises: [{ name_es: 'Plancha frontal', name_en: 'Plank', tracked_fields: ['time'] }],
      routine: {
        name: 'R', description: null,
        days: [
          { name: 'D1', sort_order: 0, blocks: [
            { name: 'Principal', sort_order: 1, exercises: [{ exercise_name: 'Plancha frontal', series: 3, reps: '30s' }] },
          ] },
        ],
      },
    }, 'user-1', {})).rejects.toBe(readError)

    expect(insertedTables).toEqual([])
  })

  // El JSON es entrada NO confiable (la genera una IA o se edita a mano) y los CHECK de las
  // columnas nuevas convertirían un valor raro en un 23514/22P02 que aborta el import ENTERO.
  it('sanea el campo objetivo y el nivel de un JSON con valores imposibles', async () => {
    const insertCalls = {}
    const systemRow = { id: 'sys-bench', name_es: 'Press banca', name_en: 'Bench Press' }
    const json = {
      version: 8,
      // No exercise definitions in the JSON and no tracked_fields on the row: nothing says what it
      // tracks, so `target_field` cannot be checked against the fields, only that it is a real
      // target field.
      routine: {
        name: 'R', description: null,
        days: [
          { name: 'D1', sort_order: 0, blocks: [
            { name: 'Principal', sort_order: 1, exercises: [
              { exercise_name: 'Press banca', series: 3, reps: '8-12', target_field: 'weight', level: -5 },
            ] },
          ] },
        ],
      },
    }

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (!insertCalls[table]) insertCalls[table] = []
        if (table === 'exercises') {
          const p = Promise.resolve({ data: [systemRow], error: null })
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        if (table === 'routines' || table === 'routine_days') {
          return { insert: vi.fn((record) => { insertCalls[table].push(record); return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `${table}-1`, ...record }, error: null }) } }) }
        }
        return { insert: vi.fn((record) => { insertCalls[table].push(...(Array.isArray(record) ? record : [record])); return Promise.resolve({ data: null, error: null }) }) }
      },
    }))

    await importRoutine(json, 'user-1', {})

    // 'weight' nunca es objetivo y un nivel negativo viola el CHECK: entran como null, y la app
    // resuelve el campo al leer.
    expect(insertCalls['routine_exercises'][0]).toMatchObject({ target_field: null, level: null })
  })

  it('keeps an explicit level 0 and stores null for a null, empty or missing level', async () => {
    const insertCalls = {}
    const systemRow = { id: 'sys-bike', name_es: 'Bici', name_en: 'Bike', tracked_fields: ['level', 'time'] }
    const exercise = (level) => ({ exercise_name: 'Bici', series: 1, reps: '20min', ...level })
    const json = {
      routine: {
        name: 'R', description: null,
        days: [{ name: 'D1', sort_order: 0, blocks: [{ name: 'Principal', sort_order: 1, exercises: [
          exercise({ level: 0 }), exercise({ level: null }), exercise({ level: '' }), exercise({ level: '  ' }), exercise({}), exercise({ level: false }), exercise({ level: '7' }), exercise({ level: 5 }),
        ] }] }],
      },
    }

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (!insertCalls[table]) insertCalls[table] = []
        if (table === 'exercises') {
          const p = Promise.resolve({ data: [systemRow], error: null })
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        if (table === 'routines' || table === 'routine_days') {
          return { insert: vi.fn((record) => { insertCalls[table].push(record); return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `${table}-1`, ...record }, error: null }) } }) }
        }
        return { insert: vi.fn((record) => { insertCalls[table].push(...(Array.isArray(record) ? record : [record])); return Promise.resolve({ data: null, error: null }) }) }
      },
    }))

    await importRoutine(json, 'user-1', {})

    expect(insertCalls['routine_exercises'].map(r => r.level)).toEqual([0, null, null, null, null, null, 7, 5])
  })

  it('enlaza con un ejercicio de sistema por name_en (no crea custom) y resuelve la ref del día', async () => {
    const insertCalls = {}
    const systemRow = { id: 'sys-bench', name_es: 'Press de banca con barra', name_en: 'Barbell Bench Press' }

    // El export referencia el ejercicio con un name_es distinto al del catálogo, pero con el
    // name_en correcto → debe casar por name_en y NO crear un ejercicio custom.
    const json = {
      version: 7,
      exercises: [
        { name_es: 'Press banca', name_en: 'Barbell Bench Press', tracked_fields: ['weight', 'reps'], muscle_group_name: 'Pecho' },
      ],
      routine: {
        name: 'R', description: null,
        days: [
          { name: 'D1', sort_order: 0, blocks: [
            { name: 'Principal', sort_order: 1, exercises: [
              { exercise_name: 'Press banca', series: 3, reps: '5', rest_seconds: 120 },
            ] },
          ] },
        ],
      },
    }

    getClient.mockImplementation(() => ({
      from: (table) => {
        if (!insertCalls[table]) insertCalls[table] = []
        if (table === 'exercises') {
          const p = Promise.resolve({ data: [systemRow], error: null })
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            then: p.then.bind(p),
            insert: vi.fn((record) => {
              insertCalls[table].push(...(Array.isArray(record) ? record : [record]))
              return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'should-not-create' }, error: null }) }
            }),
          }
        }
        if (table === 'muscle_groups') {
          const p = Promise.resolve({ data: [{ id: 'mg-1', name_es: 'Pecho', name_en: 'Chest' }], error: null })
          return { select: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        if (table === 'routines') {
          return { insert: vi.fn((record) => { insertCalls[table].push(...(Array.isArray(record) ? record : [record])); return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, ...record }, error: null }) } }) }
        }
        if (table === 'routine_days') {
          return { insert: vi.fn((record) => { insertCalls[table].push(...(Array.isArray(record) ? record : [record])); return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 10, ...record }, error: null }) } }) }
        }
        if (table === 'routine_exercises') {
          return { insert: vi.fn((record) => { insertCalls[table].push(...(Array.isArray(record) ? record : [record])); return Promise.resolve({ data: { id: 're' }, error: null }) }) }
        }
        return makeQueryMock({ data: null, error: null })
      },
    }))

    await importRoutine(json, 'user-1', {})

    // No se creó ningún ejercicio custom (casó con el de sistema por name_en)
    expect(insertCalls['exercises'] || []).toHaveLength(0)
    // La ref del día resolvió al id del ejercicio de sistema
    expect(insertCalls['routine_exercises']).toHaveLength(1)
    expect(insertCalls['routine_exercises'][0].exercise_id).toBe('sys-bench')
  })

  // Imports a routine with one day exercise and returns the routine_exercises row it inserted. The
  // exercise reads return only the columns the query selects: dropping `tracked_fields` from the
  // select fails here instead of silently falling back to the JSON's fields or the RIR scale.
  async function importSingleRoutineExercise({ dayExercise, exercises, systemRows = [], customRows = [], options = {} }) {
    const routineExerciseRows = []
    getClient.mockImplementation(() => ({
      from: (table) => {
        if (table === 'exercises') {
          let columns = []
          let isCustomQuery = false
          const chain = {
            select: vi.fn((selected) => { columns = selected.split(',').map(column => column.trim()); return chain }),
            eq: vi.fn((column) => { if (column === 'user_id') isCustomQuery = true; return chain }),
            is: vi.fn(() => chain),
            then: (resolve) => resolve({
              data: (isCustomQuery ? customRows : systemRows).map(row => Object.fromEntries(columns.map(column => [column, row[column]]))),
              error: null,
            }),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
            insert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ex-new' }, error: null }) })),
          }
          return chain
        }
        if (table === 'muscle_groups') {
          const p = Promise.resolve({ data: [], error: null })
          return { select: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        if (table === 'routines' || table === 'routine_days') {
          return { insert: vi.fn((record) => ({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `${table}-1`, ...record }, error: null }) })) }
        }
        return { insert: vi.fn((rows) => { routineExerciseRows.push(...rows); return Promise.resolve({ data: null, error: null }) }) }
      },
    }))

    await importRoutine({
      version: ROUTINE_EXPORT_VERSION,
      exercises,
      routine: {
        name: 'R', description: null,
        days: [
          { name: 'D1', sort_order: 0, blocks: [
            { name: 'Principal', sort_order: 1, exercises: [dayExercise] },
          ] },
        ],
      },
    }, 'user-1', options)

    expect(routineExerciseRows).toHaveLength(1)
    return routineExerciseRows[0]
  }

  // Target field (issue #159): an AI can declare the wrong fields for a catalog exercise it names
  // right, and the target must talk about something the exercise tracks in the DB.
  describe('target field', () => {
    const plank = { id: 'sys-plank', name_es: 'Plancha frontal', name_en: 'Plank', tracked_fields: ['time'] }

    async function importTarget(setup) {
      return (await importSingleRoutineExercise(setup)).target_field
    }

    it('resolves a matched catalog exercise against its DB fields, not the ones the JSON declares', async () => {
      expect(await importTarget({
        exercises: [{ name_es: 'Plancha', name_en: 'Plank', tracked_fields: ['weight', 'reps'] }],
        dayExercise: { exercise_name: 'Plancha', series: 3, target_field: 'reps', reps: '12' },
        systemRows: [plank],
      })).toBe('time')
    })

    it('keeps a declared target the catalog exercise does track', async () => {
      const bike = { id: 'sys-bike', name_es: 'Bici estática', name_en: 'Stationary Bike', tracked_fields: ['level', 'distance', 'time'] }
      expect(await importTarget({
        exercises: [{ name_es: 'Bici', name_en: 'Stationary Bike', tracked_fields: ['distance'] }],
        dayExercise: { exercise_name: 'Bici', series: 1, target_field: 'time', reps: '20min' },
        systemRows: [bike],
      })).toBe('time')
    })

    it('a template without declared fields gets the target from the catalog fields', async () => {
      expect(await importTarget({
        exercises: [{ name_es: plank.name_es }],
        dayExercise: { exercise_name: plank.name_es, series: 3, reps: '30s' },
        systemRows: [plank],
      })).toBe('time')
    })

    it('a created exercise resolves against the fields it was created with', async () => {
      expect(await importTarget({
        exercises: [{ name_es: 'Wall sit', tracked_fields: ['time'] }],
        dayExercise: { exercise_name: 'Wall sit', series: 3, target_field: 'reps', reps: '45s' },
      })).toBe('time')
    })

    it('a day exercise without a definition in the JSON resolves against the catalog fields', async () => {
      expect(await importTarget({
        dayExercise: { exercise_name: plank.name_es, series: 3, target_field: 'reps', reps: '30s' },
        systemRows: [plank],
      })).toBe('time')
    })

    const ownWallSit = { id: 'ex-custom', name_es: 'Wall sit', name_en: null, tracked_fields: ['weight', 'reps'] }

    it('an own exercise keeps its DB fields when the JSON redefines it and updateExercises is off', async () => {
      expect(await importTarget({
        exercises: [{ name_es: 'Wall sit', tracked_fields: ['time'] }],
        dayExercise: { exercise_name: 'Wall sit', series: 3, target_field: 'reps', reps: '12' },
        customRows: [ownWallSit],
      })).toBe('reps')
    })

    it('an own exercise rewritten by updateExercises resolves against its new fields', async () => {
      expect(await importTarget({
        exercises: [{ name_es: 'Wall sit', tracked_fields: ['time'] }],
        dayExercise: { exercise_name: 'Wall sit', series: 3, target_field: 'reps', reps: '45s' },
        customRows: [ownWallSit],
        options: { updateExercises: true },
      })).toBe('time')
    })
  })

  // Effort scale (issue #21): the JSON is untrusted and `routine_exercises.rir` has no CHECK, so an
  // off-scale value would be saved, render like a valid one and block progression forever.
  describe('effort scale', () => {
    const bench = { id: 'sys-bench', name_es: 'Press de banca con barra', name_en: 'Barbell Bench Press', tracked_fields: ['weight', 'reps'] }
    const plank = { id: 'sys-plank', name_es: 'Plancha frontal', name_en: 'Plank', tracked_fields: ['time'] }

    // Imports a one-exercise routine and returns the `rir` it inserted.
    async function importEffort({ name, rir, ...setup }) {
      return (await importSingleRoutineExercise({ ...setup, dayExercise: { exercise_name: name, series: 3, reps: '8', rir } })).rir
    }

    it.each([
      ['keeps a value on the RIR scale', { name: bench.name_es, rir: 2, systemRows: [bench] }, 2],
      ['keeps failure (-1) on the RIR scale', { name: bench.name_es, rir: -1, systemRows: [bench] }, -1],
      ['keeps 0 on the RIR scale', { name: bench.name_es, rir: 0, systemRows: [bench] }, 0],
      ['drops rir 5 on weight × reps', { name: bench.name_es, rir: 5, systemRows: [bench] }, null],
      ['drops rir -1 on an exercise without reps (RPE scale)', { name: plank.name_es, rir: -1, systemRows: [plank] }, null],
      ['stores a missing effort as null', { name: bench.name_es, rir: undefined, systemRows: [bench] }, null],
      // Strict on purpose: the format documents a number, and coercing with Number() would turn a
      // null into 0, which is a valid RIR.
      ['drops an effort written as text', { name: bench.name_es, rir: '2', systemRows: [bench] }, null],
    ])('%s', async (_name, setup, expected) => {
      expect(await importEffort(setup)).toBe(expected)
    })

    // Which fields decide the scale: the ones the exercise has in the DB once the import has
    // written it, never the weight × reps default of a JSON that does not declare them. rir 4 is
    // only valid on the RPE scale, so it survives only when the fields resolve to `time`.
    it.each([
      ['a template without declared fields uses the catalog fields',
        { name: plank.name_es, exercises: [{ name_es: plank.name_es }], systemRows: [plank] }, 4],
      ['a day exercise without a definition uses the catalog fields',
        { name: plank.name_es, systemRows: [plank] }, 4],
      ['a custom exercise uses its DB fields',
        { name: 'Wall sit', customRows: [{ id: 'ex-custom', name_es: 'Wall sit', name_en: null, tracked_fields: ['time'] }] }, 4],
      ['an existing exercise uses its DB fields, not the ones the JSON declares',
        { name: bench.name_es, exercises: [{ name_es: bench.name_es, tracked_fields: ['time'] }], systemRows: [bench] }, null],
      ['a created exercise uses the fields it was created with',
        { name: 'Wall sit', exercises: [{ name_es: 'Wall sit', tracked_fields: ['time'] }] }, 4],
      ['a custom rewritten by updateExercises uses its new fields',
        {
          name: 'Wall sit',
          exercises: [{ name_es: 'Wall sit', tracked_fields: ['time'] }],
          customRows: [{ id: 'ex-custom', name_es: 'Wall sit', name_en: null, tracked_fields: ['weight', 'reps'] }],
          options: { updateExercises: true },
        }, 4],
    ])('%s', async (_name, setup, expected) => {
      expect(await importEffort({ rir: 4, ...setup })).toBe(expected)
    })
  })
})

describe('importRoutine superset_group', () => {
  const systemRows = ['A', 'B', 'C', 'D'].map(name => ({ id: `sys-${name}`, name_es: name, name_en: null, tracked_fields: ['weight', 'reps'] }))

  function mockImportClient(insertCalls) {
    getClient.mockImplementation(() => ({
      from: (table) => {
        if (!insertCalls[table]) insertCalls[table] = []
        if (table === 'exercises') {
          const p = Promise.resolve({ data: systemRows, error: null })
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), then: p.then.bind(p) }
        }
        if (table === 'routines' || table === 'routine_days') {
          return { insert: vi.fn((record) => { insertCalls[table].push(record); return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `${table}-1`, ...record }, error: null }) } }) }
        }
        return { insert: vi.fn((record) => { insertCalls[table].push(...(Array.isArray(record) ? record : [record])); return Promise.resolve({ data: null, error: null }) }) }
      },
    }))
  }

  const row = (name, supersetGroup) => ({ exercise_name: name, series: 3, reps: '10', ...(supersetGroup === undefined ? {} : { superset_group: supersetGroup }) })
  const jsonWithBlocks = (blocks) => ({ routine: { name: 'R', description: null, days: [{ name: 'D1', sort_order: 0, blocks }] } })

  async function importGroups(blocks) {
    const insertCalls = {}
    mockImportClient(insertCalls)
    await importRoutine(jsonWithBlocks(blocks), 'user-1', {})
    return insertCalls['routine_exercises'].map(r => r.superset_group)
  }

  it('keeps a superset whose members are consecutive', async () => {
    expect(await importGroups([{ name: 'Principal', exercises: [row('A', 1), row('B', 1), row('C', null)] }])).toEqual([1, 1, null])
  })

  it('imports a JSON from before v10 (no superset_group) without supersets and without error', async () => {
    expect(await importGroups([{ name: 'Principal', exercises: [row('A'), row('B')] }])).toEqual([null, null])
  })

  it('undoes a single-member group and a group whose members are not consecutive', async () => {
    expect(await importGroups([{ name: 'Principal', exercises: [row('A', 1), row('B', 2), row('C', null), row('D', 2)] }]))
      .toEqual([null, null, null, null])
  })

  it('keeps a group that is consecutive in the warmup and consecutive in the main block', async () => {
    expect(await importGroups([
      { name: 'Calentamiento', exercises: [row('A', 1), row('B', 1)] },
      { name: 'Principal', exercises: [row('C', 1), row('D', 1)] },
    ])).toEqual([1, 1, 1, 1])
  })

  it('checks consecutiveness per warmup/main list, not per JSON block', async () => {
    expect(await importGroups([
      { name: 'Principal', exercises: [row('A', 1), row('B', 1)] },
      { name: 'Main', exercises: [row('C', null), row('D', 1)] },
    ])).toEqual([null, null, null, null])
  })

  it('undoes a group left with one member when another member does not resolve', async () => {
    expect(await importGroups([{ name: 'Principal', exercises: [row('A', 1), row('Unknown', 1)] }])).toEqual([null])
  })
})

// ============================================
// TEST: duplicateRoutine — crea copia con sufijo "(copia)"
// ============================================

describe('duplicateRoutine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Export through the RPC, import through from(): records what the import writes
  function mockDuplicateClient(rows, catalog = []) {
    const inserted = { routines: [], routine_exercises: [] }
    getClient.mockImplementation(() => ({
      rpc: vi.fn().mockResolvedValue({ data: rows, error: null }),
      from: (table) => {
        if (table === 'exercises') {
          const resolved = Promise.resolve({ data: catalog, error: null })
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            then: resolved.then.bind(resolved),
            insert: vi.fn((record) => ({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `new-${record.name_es}`, ...record }, error: null }) })),
          }
        }
        if (table === 'muscle_groups') {
          const resolved = Promise.resolve({ data: [], error: null })
          return { select: vi.fn().mockReturnThis(), then: resolved.then.bind(resolved) }
        }
        if (table === 'routines' || table === 'routine_days') {
          return {
            insert: vi.fn((record) => {
              inserted[table]?.push(record)
              return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: `${table}-new`, ...record }, error: null }) }
            }),
          }
        }
        if (table === 'routine_exercises') {
          return { insert: vi.fn((rows) => { inserted.routine_exercises.push(...rows); return Promise.resolve({ data: null, error: null }) }) }
        }
        return makeQueryMock({ data: null, error: null })
      },
    }))
    return inserted
  }

  const catalogFrom = (rows) => rows.exercises.map(e => ({ id: e.id, name_es: e.name_es, name_en: e.name_en, tracked_fields: e.tracked_fields }))

  it('crea una copia de la rutina con sufijo "(copia)" en el nombre', async () => {
    const rows = exportRows({ routine: { name: 'Rutina Original', description: null } })
    const inserted = mockDuplicateClient(rows, catalogFrom(rows))

    const result = await duplicateRoutine('routine-1', 'user-1')

    expect(inserted.routines).toHaveLength(1)
    expect(inserted.routines[0].name).toBe('Rutina Original (copia)')
    expect(result.name).toBe('Rutina Original (copia)')
  })

  it('keeps the supersets, the order and the empty levels of the original routine', async () => {
    const rows = exportRows()
    const inserted = mockDuplicateClient(rows, catalogFrom(rows))

    await duplicateRoutine('routine-1', 'user-1')

    expect(inserted.routine_exercises.map(r => [r.exercise_id, r.is_warmup, r.superset_group])).toEqual([
      [12, true, null], [10, false, 1], [11, false, 1],
      [10, false, null],
    ])
    // The export writes `level: null` for an exercise without a level, and Number(null) is 0: the
    // copy must keep it empty, not show "Nv0" (#138). An explicit level is kept.
    expect(inserted.routine_exercises.map(r => r.level)).toEqual([4, null, null, null])
  })

  it('usa el nombre personalizado si se proporciona', async () => {
    const rows = exportRows({ routine_exercises: [] })
    const inserted = mockDuplicateClient(rows)

    const result = await duplicateRoutine('routine-1', 'user-1', 'Mi Copia Personalizada')

    expect(inserted.routines[0].name).toBe('Mi Copia Personalizada')
    expect(result.name).toBe('Mi Copia Personalizada')
  })
})
