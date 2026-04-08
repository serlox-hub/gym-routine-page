import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeQueryMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from './_client.js'

import {
  fetchRoutines,
  fetchRoutine,
  fetchRoutineDays,
  fetchRoutineDay,
  fetchRoutineBlocks,
  fetchRoutineAllExercises,
} from './routineQueryApi.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// fetchRoutines
// ============================================

describe('fetchRoutines', () => {
  it('returns routines array ordered by id', async () => {
    const routines = [
      { id: 1, name: 'Rutina A', is_favorite: true },
      { id: 2, name: 'Rutina B', is_favorite: false },
    ]
    const mock = makeQueryMock({ data: routines, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutines()
    expect(result).toEqual(routines)
    expect(result).toHaveLength(2)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('fetch routines failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchRoutines()).rejects.toThrow('fetch routines failed')
  })

  it('returns empty array when user has no routines', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutines()
    expect(result).toEqual([])
  })
})

// ============================================
// fetchRoutine
// ============================================

describe('fetchRoutine', () => {
  it('returns single routine on success', async () => {
    const routine = { id: 1, name: 'Rutina A', description: 'Desc', goal: 'Fuerza' }
    const mock = makeQueryMock({ data: routine, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutine(1)
    expect(result).toEqual(routine)
    expect(result.id).toBe(1)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('routine not found') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchRoutine(999)).rejects.toThrow('routine not found')
  })
})

// ============================================
// fetchRoutineDays
// ============================================

describe('fetchRoutineDays', () => {
  it('returns routine days array', async () => {
    const days = [
      { id: 10, routine_id: 1, name: 'Día 1', sort_order: 1 },
      { id: 11, routine_id: 1, name: 'Día 2', sort_order: 2 },
    ]
    const mock = makeQueryMock({ data: days, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutineDays(1)
    expect(result).toEqual(days)
    expect(result).toHaveLength(2)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('fetch days failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchRoutineDays(1)).rejects.toThrow('fetch days failed')
  })

  it('returns empty array when routine has no days', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutineDays(1)
    expect(result).toEqual([])
  })
})

// ============================================
// fetchRoutineDay
// ============================================

describe('fetchRoutineDay', () => {
  it('returns single day with routine name', async () => {
    const day = { id: 10, name: 'Día 1', routine: { name: 'Rutina A' } }
    const mock = makeQueryMock({ data: day, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutineDay(10)
    expect(result).toEqual(day)
    expect(result.routine.name).toBe('Rutina A')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('day not found') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchRoutineDay(999)).rejects.toThrow('day not found')
  })
})

// ============================================
// fetchRoutineBlocks
// ============================================

describe('fetchRoutineBlocks', () => {
  it('groups exercises into virtual blocks by is_warmup', async () => {
    const exercises = [
      { id: 30, sort_order: 1, is_warmup: true },
      { id: 31, sort_order: 2, is_warmup: false },
      { id: 32, sort_order: 3, is_warmup: false },
    ]
    const mock = makeQueryMock({ data: exercises, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutineBlocks(10)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Calentamiento')
    expect(result[0].is_warmup).toBe(true)
    expect(result[0].routine_exercises).toHaveLength(1)
    expect(result[1].name).toBe('Principal')
    expect(result[1].is_warmup).toBe(false)
    expect(result[1].routine_exercises).toHaveLength(2)
  })

  it('places Calentamiento block first', async () => {
    const exercises = [
      { id: 31, sort_order: 1, is_warmup: false },
      { id: 30, sort_order: 2, is_warmup: true },
    ]
    const mock = makeQueryMock({ data: exercises, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutineBlocks(10)
    expect(result[0].name).toBe('Calentamiento')
    expect(result[1].name).toBe('Principal')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('fetch blocks failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchRoutineBlocks(10)).rejects.toThrow('fetch blocks failed')
  })

  it('returns empty array when day has no exercises', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutineBlocks(10)
    expect(result).toEqual([])
  })
})

// ============================================
// fetchRoutineAllExercises
// ============================================

describe('fetchRoutineAllExercises', () => {
  it('returns all exercises for a routine', async () => {
    const exercises = [
      { id: 40, exercise_id: 'ex-1', routine_block: { routine_day: { routine_id: 1 } } },
      { id: 41, exercise_id: 'ex-2', routine_block: { routine_day: { routine_id: 1 } } },
    ]
    const mock = makeQueryMock({ data: exercises, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutineAllExercises(1)
    expect(result).toEqual(exercises)
    expect(result).toHaveLength(2)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('fetch exercises failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchRoutineAllExercises(1)).rejects.toThrow('fetch exercises failed')
  })

  it('returns empty array when routine has no exercises', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchRoutineAllExercises(1)
    expect(result).toEqual([])
  })
})
