import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SharedRoutineNotFoundError,
  enableRoutineShare,
  disableRoutineShare,
  fetchSharedRoutine,
  importSharedRoutine,
} from './routineShareApi.js'
import { importRoutine } from './routineIOApi.js'

vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
}))

vi.mock('./routineIOApi.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, importRoutine: vi.fn() }
})

import { getClient } from './_client.js'

const SHARED_ROWS = {
  routine: { name: 'Compartida', description: null },
  days: [{ id: 1, name: 'D1', estimated_duration_min: null, sort_order: 1 }],
  routine_exercises: [
    { routine_day_id: 1, exercise_id: 7, series: 3, target_field: 'reps', reps: '10', level: null, rir: null, rest_seconds: null, notes: null, sort_order: 1, is_warmup: false, superset_group: null },
  ],
  exercises: [{ id: 7, name_es: 'Sentadilla', name_en: 'Squat', tracked_fields: ['weight', 'reps'], distance_unit: 'm', instructions: null, muscle_group_name_es: 'Cuádriceps' }],
}

function mockRpc(response) {
  const rpc = vi.fn().mockResolvedValue(response)
  getClient.mockReturnValue({ rpc })
  return rpc
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('enableRoutineShare', () => {
  it('returns the token and sends the id as a number', async () => {
    const rpc = mockRpc({ data: 'abcdefghijklmnopqrstuv', error: null })
    await expect(enableRoutineShare('12')).resolves.toBe('abcdefghijklmnopqrstuv')
    expect(rpc).toHaveBeenCalledWith('enable_routine_share', { p_routine_id: 12 })
  })

  it('throws the RPC error (not the owner)', async () => {
    const error = { code: '42501', message: 'not_owner' }
    mockRpc({ data: null, error })
    await expect(enableRoutineShare(12)).rejects.toBe(error)
  })
})

describe('disableRoutineShare', () => {
  it('calls the RPC with the id as a number', async () => {
    const rpc = mockRpc({ data: null, error: null })
    await expect(disableRoutineShare('12')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('disable_routine_share', { p_routine_id: 12 })
  })

  it('throws the RPC error', async () => {
    const error = { code: '42501', message: 'not_owner' }
    mockRpc({ data: null, error })
    await expect(disableRoutineShare(12)).rejects.toBe(error)
  })
})

describe('fetchSharedRoutine', () => {
  it('returns the export JSON built from the shared rows', async () => {
    const rpc = mockRpc({ data: SHARED_ROWS, error: null })
    const shared = await fetchSharedRoutine('tok')
    expect(rpc).toHaveBeenCalledWith('get_shared_routine', { p_token: 'tok' })
    expect(shared.routine.name).toBe('Compartida')
    expect(shared.routine.days[0].blocks[0].exercises[0].exercise_name).toBe('Sentadilla')
    expect(shared.exercises).toHaveLength(1)
  })

  it('returns null for a dead link', async () => {
    mockRpc({ data: null, error: null })
    await expect(fetchSharedRoutine('tok')).resolves.toBeNull()
  })

  it('throws on an RPC error instead of reporting a dead link', async () => {
    const error = { message: 'Failed to fetch' }
    mockRpc({ data: null, error })
    await expect(fetchSharedRoutine('tok')).rejects.toBe(error)
  })
})

describe('importSharedRoutine', () => {
  it('copies through importRoutine without updating the receiver exercises', async () => {
    mockRpc({ data: SHARED_ROWS, error: null })
    importRoutine.mockResolvedValue({ id: 99, name: 'Compartida' })

    await expect(importSharedRoutine('tok', 'user-2')).resolves.toEqual({ id: 99, name: 'Compartida' })
    expect(importRoutine).toHaveBeenCalledWith(
      expect.objectContaining({ routine: expect.objectContaining({ name: 'Compartida' }) }),
      'user-2',
      { updateExercises: false }
    )
  })

  it('throws SharedRoutineNotFoundError for a dead link and imports nothing', async () => {
    mockRpc({ data: null, error: null })
    await expect(importSharedRoutine('tok', 'user-2')).rejects.toBeInstanceOf(SharedRoutineNotFoundError)
    expect(importRoutine).not.toHaveBeenCalled()
  })
})
