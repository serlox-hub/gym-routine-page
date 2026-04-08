import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from './_client.js'

import {
  fetchSessionExercises,
  fetchSessionExercisesSortOrder,
  updateSessionExerciseSortOrder,
  insertSessionExercise,
  deleteCompletedSetsByExercise,
  updateSessionExerciseExerciseId,
  addSessionExercise,
  deleteSessionExercise,
  reorderSessionExercises,
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
// fetchSessionExercisesSortOrder
// ============================================

describe('fetchSessionExercisesSortOrder', () => {
  it('returns sort order data on success', async () => {
    const sortData = [
      { id: 'se-1', sort_order: 1, superset_group: null },
      { id: 'se-2', sort_order: 2, superset_group: 'A' },
    ]
    const mock = makeQueryMock({ data: sortData, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchSessionExercisesSortOrder('session-1')
    expect(result).toEqual(sortData)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('sort fetch failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchSessionExercisesSortOrder('session-1')).rejects.toThrow('sort fetch failed')
  })

  it('returns empty array when data is null (no exercises)', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchSessionExercisesSortOrder('session-1')
    expect(result).toEqual([])
  })
})

// ============================================
// updateSessionExerciseSortOrder
// ============================================

describe('updateSessionExerciseSortOrder', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateSessionExerciseSortOrder('se-1', 3)).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('update failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateSessionExerciseSortOrder('se-1', 3)).rejects.toThrow('update failed')
  })

  it('accepts sort order of zero', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateSessionExerciseSortOrder('se-1', 0)).resolves.toBeUndefined()
  })
})

// ============================================
// insertSessionExercise
// ============================================

describe('insertSessionExercise', () => {
  it('returns inserted record on success', async () => {
    const inserted = {
      id: 'se-new',
      exercise_id: 'ex-1',
      sort_order: 5,
      series: 3,
      reps: '10',
      is_extra: true,
      is_warmup: false,
    }
    const mock = makeQueryMock({ data: inserted, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await insertSessionExercise({
      sessionId: 'session-1',
      exerciseId: 'ex-1',
      sortOrder: 5,
      series: 3,
      reps: '10',
      rir: null,
      restSeconds: null,
      notes: null,
      supersetGroup: null,
      isWarmup: false,
    })
    expect(result).toEqual(inserted)
    expect(result.is_extra).toBe(true)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('insert failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(insertSessionExercise({
      sessionId: 'session-1',
      exerciseId: 'ex-1',
      sortOrder: 1,
    })).rejects.toThrow('insert failed')
  })

  it('uses default series and reps when not provided', async () => {
    const inserted = { id: 'se-new', series: 3, reps: '10', sort_order: 1 }
    const mock = makeQueryMock({ data: inserted, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await insertSessionExercise({
      sessionId: 'session-1',
      exerciseId: 'ex-1',
      sortOrder: 1,
    })
    // The function defaults series to 3 and reps to '10' internally
    expect(result.series).toBe(3)
    expect(result.reps).toBe('10')
  })
})

// ============================================
// deleteCompletedSetsByExercise
// ============================================

describe('deleteCompletedSetsByExercise', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteCompletedSetsByExercise({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
    })).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('delete sets failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteCompletedSetsByExercise({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
    })).rejects.toThrow('delete sets failed')
  })
})

// ============================================
// updateSessionExerciseExerciseId
// ============================================

describe('updateSessionExerciseExerciseId', () => {
  it('returns updated record on success', async () => {
    const updated = { id: 'se-1', exercise_id: 'ex-new' }
    const mock = makeQueryMock({ data: updated, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await updateSessionExerciseExerciseId({
      sessionExerciseId: 'se-1',
      newExerciseId: 'ex-new',
    })
    expect(result).toEqual(updated)
    expect(result.exercise_id).toBe('ex-new')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('update exercise id failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateSessionExerciseExerciseId({
      sessionExerciseId: 'se-1',
      newExerciseId: 'ex-new',
    })).rejects.toThrow('update exercise id failed')
  })
})

// ============================================
// addSessionExercise (composed)
// ============================================

describe('addSessionExercise', () => {
  it('calculates correct sort_order when no existing exercises', async () => {
    // fetchSessionExercisesSortOrder returns empty → sort_order = 1
    // insertSessionExercise returns new record
    let callCount = 0
    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // fetchSessionExercisesSortOrder call
        return makeClientMock({ session_exercises: { data: [], error: null } })
      }
      // insertSessionExercise call
      return makeClientMock({
        session_exercises: { data: { id: 'se-new', sort_order: 1 }, error: null },
      })
    })
    const result = await addSessionExercise({
      sessionId: 'session-1',
      exercise: { id: 'ex-1' },
    })
    expect(result).toMatchObject({ id: 'se-new', sort_order: 1 })
  })

  it('appends after last exercise when no superset', async () => {
    const existing = [
      { id: 'se-1', sort_order: 1, superset_group: null },
      { id: 'se-2', sort_order: 2, superset_group: null },
    ]
    let callCount = 0
    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeClientMock({ session_exercises: { data: existing, error: null } })
      }
      return makeClientMock({
        session_exercises: { data: { id: 'se-new', sort_order: 3 }, error: null },
      })
    })
    const result = await addSessionExercise({
      sessionId: 'session-1',
      exercise: { id: 'ex-3' },
    })
    expect(result).toMatchObject({ sort_order: 3 })
  })

  it('throws when fetchSessionExercisesSortOrder fails', async () => {
    getClient.mockImplementation(() =>
      makeClientMock({ session_exercises: { data: null, error: new Error('fetch failed') } })
    )
    await expect(addSessionExercise({
      sessionId: 'session-1',
      exercise: { id: 'ex-1' },
    })).rejects.toThrow('fetch failed')
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
  it('completes without throwing on success', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) }
    getClient.mockReturnValue(clientMock)
    await expect(reorderSessionExercises(['se-1', 'se-2', 'se-3'])).resolves.toBeUndefined()
    expect(clientMock.rpc).toHaveBeenCalledWith('reorder_session_exercises', {
      exercise_orders: [
        { id: 'se-1', sort_order: 1 },
        { id: 'se-2', sort_order: 2 },
        { id: 'se-3', sort_order: 3 },
      ],
    })
  })

  it('throws when rpc returns error', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('rpc failed') }) }
    getClient.mockReturnValue(clientMock)
    await expect(reorderSessionExercises(['se-1', 'se-2'])).rejects.toThrow('rpc failed')
  })

  it('maps ids to 1-based sort_order correctly', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) }
    getClient.mockReturnValue(clientMock)
    await reorderSessionExercises(['a', 'b'])
    const { exercise_orders } = clientMock.rpc.mock.calls[0][1]
    expect(exercise_orders[0]).toEqual({ id: 'a', sort_order: 1 })
    expect(exercise_orders[1]).toEqual({ id: 'b', sort_order: 2 })
  })
})
