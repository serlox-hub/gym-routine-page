import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from './_client.js'

import {
  fetchSessionExercises,
  replaceSessionExercise,
  addSessionExercise,
  deleteSessionExercise,
  reorderSessionExercises,
  updateSessionExerciseFields,
} from './sessionExercisesApi.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// fetchSessionExercises
// ============================================

describe('fetchSessionExercises', () => {
  it('returns exercise array on success', async () => {
    const exercises = [
      { id: 'se-1', exercise_id: 'ex-1', sort_order: 1, is_warmup: false },
      { id: 'se-2', exercise_id: 'ex-2', sort_order: 2, is_warmup: false },
    ]
    const mock = makeQueryMock({ data: exercises, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchSessionExercises('session-1')
    expect(result).toEqual(exercises)
    expect(result).toHaveLength(2)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('fetch failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchSessionExercises('session-1')).rejects.toThrow('fetch failed')
  })

  it('returns empty array when no exercises', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchSessionExercises('session-1')
    expect(result).toEqual([])
  })
})

// ============================================
// replaceSessionExercise
// ============================================

describe('replaceSessionExercise', () => {
  it('llama al RPC atómico con el parche y el alcance', async () => {
    const clientMock = makeClientMock()
    getClient.mockReturnValue(clientMock)
    const fields = { target_field: 'time', reps: '30s', level: null, rir: null, notes: null }
    await replaceSessionExercise({ sessionExerciseId: 5, newExerciseId: 9, fields, applyToRoutine: true })
    expect(clientMock.rpc).toHaveBeenCalledWith('replace_session_exercise', {
      p_session_exercise_id: 5,
      p_new_exercise_id: 9,
      p_fields: fields,
      p_apply_to_routine: true,
    })
    expect(clientMock.from).not.toHaveBeenCalled()
  })

  it('lanza si el RPC falla', async () => {
    const clientMock = makeClientMock()
    clientMock.rpc.mockResolvedValue({ data: null, error: new Error('exercise_not_available') })
    getClient.mockReturnValue(clientMock)
    await expect(replaceSessionExercise({ sessionExerciseId: 5, newExerciseId: 9, fields: {}, applyToRoutine: false }))
      .rejects.toThrow('exercise_not_available')
  })
})

// ============================================
// addSessionExercise
// ============================================

describe('addSessionExercise', () => {
  const FIELDS = { series: 1, reps: '20min', target_field: 'time', level: 8, rir: null, rest_seconds: 60, notes: null }

  it('calls the atomic RPC with the fields, the superset and the scope', async () => {
    const clientMock = makeClientMock()
    clientMock.rpc.mockResolvedValue({ data: { session_exercise_id: 40, routine_exercise_id: 90 }, error: null })
    getClient.mockReturnValue(clientMock)

    const result = await addSessionExercise({ sessionId: 'session-1', exerciseId: 9, fields: FIELDS, supersetGroup: 2, addToRoutine: true })

    expect(clientMock.rpc).toHaveBeenCalledWith('add_session_exercise', {
      p_session_id: 'session-1',
      p_exercise_id: 9,
      p_fields: FIELDS,
      p_superset_group: 2,
      p_add_to_routine: true,
    })
    expect(clientMock.from).not.toHaveBeenCalled()
    expect(result).toEqual({ session_exercise_id: 40, routine_exercise_id: 90 })
  })

  // Every argument goes explicitly: PostgREST picks the function by the argument names it receives.
  it('sends a standalone add as p_superset_group null and a missing scope as false', async () => {
    const clientMock = makeClientMock()
    clientMock.rpc.mockResolvedValue({ data: { session_exercise_id: 40, routine_exercise_id: null }, error: null })
    getClient.mockReturnValue(clientMock)

    await addSessionExercise({ sessionId: 'session-1', exerciseId: 9, fields: FIELDS })

    expect(clientMock.rpc.mock.calls[0][1]).toMatchObject({ p_superset_group: null, p_add_to_routine: false })
  })

  it('throws when the RPC fails', async () => {
    const clientMock = makeClientMock()
    clientMock.rpc.mockResolvedValue({ data: null, error: new Error('session_not_found') })
    getClient.mockReturnValue(clientMock)
    await expect(addSessionExercise({ sessionId: 'session-1', exerciseId: 9, fields: FIELDS, supersetGroup: null, addToRoutine: false }))
      .rejects.toThrow('session_not_found')
  })
})

// ============================================
// deleteSessionExercise
// ============================================

describe('deleteSessionExercise', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteSessionExercise('se-1')).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('delete failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteSessionExercise('se-1')).rejects.toThrow('delete failed')
  })
})

// ============================================
// reorderSessionExercises
// ============================================

describe('reorderSessionExercises', () => {
  it('sends the items as 1-based sort_order, without superset_group when the key is absent', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) }
    getClient.mockReturnValue(clientMock)
    await expect(reorderSessionExercises([{ id: 1 }, { id: 2 }, { id: 3 }])).resolves.toBeUndefined()
    expect(clientMock.rpc).toHaveBeenCalledWith('reorder_session_exercises', {
      exercise_orders: [
        { id: 1, sort_order: 1 },
        { id: 2, sort_order: 2 },
        { id: 3, sort_order: 3 },
      ],
    })
  })

  it('sends superset_group only for the items that carry supersetGroup, null included', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) }
    getClient.mockReturnValue(clientMock)
    await reorderSessionExercises([{ id: 1, supersetGroup: 4 }, { id: 2 }, { id: 3, supersetGroup: null }])
    expect(clientMock.rpc.mock.calls[0][1].exercise_orders).toEqual([
      { id: 1, sort_order: 1, superset_group: 4 },
      { id: 2, sort_order: 2 },
      { id: 3, sort_order: 3, superset_group: null },
    ])
  })

  it('throws when rpc returns error', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('rpc failed') }) }
    getClient.mockReturnValue(clientMock)
    await expect(reorderSessionExercises([{ id: 1 }, { id: 2 }])).rejects.toThrow('rpc failed')
  })
})

// ============================================
// updateSessionExerciseFields
// ============================================

describe('updateSessionExerciseFields', () => {
  it('without propagation updates only session_exercises', async () => {
    const clientMock = makeClientMock()
    getClient.mockReturnValue(clientMock)
    await updateSessionExerciseFields('se-1', { rir: null })
    expect(clientMock.from).toHaveBeenCalledWith('session_exercises')
    expect(clientMock.from).not.toHaveBeenCalledWith('routine_exercises')
    expect(clientMock.rpc).not.toHaveBeenCalled()
  })

  it('with propagation goes through the atomic RPC and never writes tables directly', async () => {
    const clientMock = makeClientMock()
    getClient.mockReturnValue(clientMock)
    await updateSessionExerciseFields('se-1', { reps: '8-10', notes: null }, { propagateToRoutine: true })
    expect(clientMock.rpc).toHaveBeenCalledWith('update_session_exercise_with_routine', {
      p_session_exercise_id: 'se-1',
      p_fields: { reps: '8-10', notes: null },
    })
    expect(clientMock.from).not.toHaveBeenCalled()
  })

  it('throws when the RPC fails', async () => {
    const clientMock = makeClientMock()
    clientMock.rpc.mockResolvedValue({ data: null, error: new Error('rpc failed') })
    getClient.mockReturnValue(clientMock)
    await expect(updateSessionExerciseFields('se-1', { series: 4 }, { propagateToRoutine: true })).rejects.toThrow('rpc failed')
  })

  it('throws when the plain update fails', async () => {
    getClient.mockReturnValue(makeClientMock({ session_exercises: { data: null, error: new Error('update failed') } }))
    await expect(updateSessionExerciseFields('se-1', { series: 4 })).rejects.toThrow('update failed')
  })
})
