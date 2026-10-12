import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { createJSONStorage } from 'zustand/middleware'
import React from 'react'

// useEndSession against the REAL workout store and sync queue (issue #179). Apart from
// useSession.test.js, which mocks the store module for the rest of the session hooks.

vi.mock('../api/completedSetsApi.js', () => ({
  upsertCompletedSet: vi.fn(),
  deleteCompletedSet: vi.fn(),
}))
vi.mock('../api/workoutApi.js', () => ({
  fetchActiveSession: vi.fn(),
  fetchCompletedSetsForSession: vi.fn(),
  startWorkoutSession: vi.fn(),
  fetchExerciseIdsWithSets: vi.fn(),
  deleteSessionExercisesWithoutSets: vi.fn(),
  completeWorkoutSession: vi.fn(),
  deleteWorkoutSession: vi.fn(),
  fetchLastSetPerformedAt: vi.fn(),
}))
vi.mock('../api/exerciseStatsApi.js', () => ({
  fetchExerciseBests: vi.fn(),
  upsertExerciseSessionStats: vi.fn(),
}))
vi.mock('../api/sessionExercisesApi.js', () => ({ fetchSessionExercises: vi.fn() }))
vi.mock('../api/gymsApi.js', () => ({ changeSessionGym: vi.fn() }))
vi.mock('./useAuth.js', () => ({ useUserId: () => 'user-1' }))
vi.mock('./usePreferences.js', () => ({ usePreference: () => ({ value: null }) }))
vi.mock('./useGyms.js', () => ({ useSetSelectedGym: () => ({ setSelectedGym: vi.fn() }) }))
vi.mock('./useExercises.js', () => ({ useAllUserExerciseGymUnits: () => ({ data: [] }) }))

import { upsertCompletedSet, deleteCompletedSet } from '../api/completedSetsApi.js'
import {
  fetchExerciseIdsWithSets,
  deleteSessionExercisesWithoutSets,
  completeWorkoutSession,
} from '../api/workoutApi.js'
import { fetchExerciseBests, upsertExerciseSessionStats } from '../api/exerciseStatsApi.js'
import { fetchSessionExercises } from '../api/sessionExercisesApi.js'
import { createWorkoutStore } from '../stores/createWorkoutStore.js'
import { initStores } from './_stores.js'
import { drainPendingSets, UnsavedSetsError, UNSAVED_SETS_REASON } from '../lib/pendingSetsSync.js'
import { useEndSession } from './useSession.js'

const SESSION = 7
const SE = 11
const networkError = () => ({ message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' })
const serverError = () => ({ message: 'rejected', details: null, hint: null, code: '23514' })

function memStorage() {
  const raw = new Map()
  return createJSONStorage(() => ({
    getItem: (k) => (raw.has(k) ? raw.get(k) : null),
    setItem: (k, v) => { raw.set(k, v) },
    removeItem: (k) => { raw.delete(k) },
  }))
}

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

let store
// Every request, in order, to check what runs before what.
let calls

function state() {
  return store.getState()
}

function queueSet(setNumber, weight) {
  state().completeSet(SE, setNumber, { weight, repsCompleted: 5 })
  state().markSetDirty(SE, setNumber)
}

/** Ends the workout and returns the error it fails with (undefined if it succeeds). */
async function endWorkout(variables = {}) {
  const { result } = renderHook(() => useEndSession(), { wrapper: wrapper() })
  let error
  await act(async () => {
    await result.current.mutateAsync({ overallFeeling: null, notes: null, ...variables }).catch(e => { error = e })
  })
  return error
}

function endFlowCalls() {
  return [fetchExerciseIdsWithSets, deleteSessionExercisesWithoutSets, completeWorkoutSession, upsertExerciseSessionStats]
    .flatMap(fn => fn.mock.calls)
}

beforeEach(async () => {
  await drainPendingSets()
  vi.clearAllMocks()
  calls = []
  upsertCompletedSet.mockReset().mockImplementation(async (payload) => {
    calls.push('upsert')
    return { id: payload.setNumber }
  })
  deleteCompletedSet.mockReset().mockResolvedValue(undefined)
  fetchExerciseIdsWithSets.mockImplementation(async () => { calls.push('fetchExerciseIdsWithSets'); return [SE] })
  completeWorkoutSession.mockResolvedValue({ id: SESSION })
  fetchSessionExercises.mockResolvedValue([{ id: SE, exercise_id: 100, exercise: { name: 'Press', tracked_fields: ['weight', 'reps'] } }])
  fetchExerciseBests.mockResolvedValue({})
  upsertExerciseSessionStats.mockResolvedValue(undefined)

  store = createWorkoutStore(memStorage())
  initStores({ authStore: null, workoutStore: store })
  state().startSession(SESSION, null)
})

describe('useEndSession with queued sets (issue 179)', () => {
  it('drains the queue before any server read, then ends as usual', async () => {
    queueSet(1, 100)

    const error = await endWorkout()

    expect(error).toBeUndefined()
    expect(calls).toEqual(['upsert', 'fetchExerciseIdsWithSets'])
    expect(completeWorkoutSession).toHaveBeenCalledWith(expect.objectContaining({ sessionId: SESSION }))
  })

  it('with sets still unsaved after draining, fails as network and touches nothing else', async () => {
    upsertCompletedSet.mockImplementation(async () => { throw networkError() })
    queueSet(1, 100)
    const queued = state().pendingSets

    const error = await endWorkout()

    expect(error).toBeInstanceOf(UnsavedSetsError)
    expect(error).toEqual(expect.objectContaining({ reason: UNSAVED_SETS_REASON.NETWORK, count: 1 }))
    expect(endFlowCalls()).toEqual([])
    expect(state().pendingSets).toEqual(queued)
    expect(state().sessionId).toBe(SESSION)
  })

  it('with only rejected sets, fails as rejected; finishing without them drops them and the stats leave them out', async () => {
    queueSet(1, 100)
    upsertCompletedSet.mockImplementationOnce(async () => { calls.push('upsert'); return { id: 1 } })
      .mockImplementationOnce(async () => { throw serverError() })
    queueSet(2, 200)
    await drainPendingSets()

    const error = await endWorkout()
    expect(error).toEqual(expect.objectContaining({ reason: UNSAVED_SETS_REASON.REJECTED, count: 1 }))
    expect(endFlowCalls()).toEqual([])
    expect(state().pendingSets[`${SE}-2`].failed).toBe(true)

    // Read when the session is closed: on success the store is emptied right after.
    let atClose
    completeWorkoutSession.mockImplementationOnce(async () => {
      atClose = state()
      return { id: SESSION }
    })
    const retry = await endWorkout({ discardUnsavedSets: true })
    expect(retry).toBeUndefined()
    expect(atClose.pendingSets).toEqual({})
    expect(Object.keys(atClose.completedSets)).toEqual([`${SE}-1`])
    expect(upsertExerciseSessionStats).toHaveBeenCalledWith([
      expect.objectContaining({ exerciseId: 100, totalSets: 1, bestWeight: 100 }),
    ])
  })

  it('finishing without rejected sets still waits while others can be sent', async () => {
    upsertCompletedSet.mockImplementation(async () => { throw networkError() })
    queueSet(1, 100)

    const error = await endWorkout({ discardUnsavedSets: true })

    expect(error).toEqual(expect.objectContaining({ reason: UNSAVED_SETS_REASON.NETWORK }))
    expect(state().completedSets[`${SE}-1`]).toBeDefined()
    expect(endFlowCalls()).toEqual([])
  })

  it('a set a running drain left queued after spending its sends is saved by a fresh drain, and the workout ends', async () => {
    // The user keeps touching set 1 while its first three requests are in flight: the drain running
    // when they tap "Done" hits its per-set limit and stops with the set still queued and sendable.
    let touchesLeft = 3
    upsertCompletedSet.mockImplementation(async (payload) => {
      calls.push('upsert')
      if (touchesLeft > 0) {
        touchesLeft -= 1
        state().markSetDirty(SE, 1)
      }
      return { id: payload.setNumber }
    })
    state().completeSet(SE, 1, { weight: 100, repsCompleted: 5 })
    state().markSetDirty(SE, 1)
    const runningDrain = drainPendingSets()

    const error = await endWorkout()
    await runningDrain

    expect(error).toBeUndefined()
    expect(calls).toEqual(['upsert', 'upsert', 'upsert', 'upsert', 'fetchExerciseIdsWithSets'])
    expect(completeWorkoutSession).toHaveBeenCalledWith(expect.objectContaining({ sessionId: SESSION }))
  })

  it('when the second drain also leaves a set sendable, it still fails as network', async () => {
    // Touched during every request, forever: even a fresh drain cannot empty the queue.
    upsertCompletedSet.mockImplementation(async (payload) => {
      calls.push('upsert')
      state().markSetDirty(SE, 1)
      return { id: payload.setNumber }
    })
    queueSet(1, 100)

    const error = await endWorkout()

    expect(error).toEqual(expect.objectContaining({ reason: UNSAVED_SETS_REASON.NETWORK, count: 1 }))
    expect(endFlowCalls()).toEqual([])
  })

  it('offline, it still drains and fails as network instead of pausing until the signal returns', async () => {
    onlineManager.setOnline(false)
    try {
      upsertCompletedSet.mockImplementation(async () => { throw networkError() })
      queueSet(1, 100)

      const error = await endWorkout()

      expect(error).toEqual(expect.objectContaining({ reason: UNSAVED_SETS_REASON.NETWORK, count: 1 }))
      expect(upsertCompletedSet).toHaveBeenCalled()
      expect(endFlowCalls()).toEqual([])
    } finally {
      onlineManager.setOnline(true)
    }
  })

  it('a temporary server error leaves the set sendable, so it fails as network and not as rejected', async () => {
    upsertCompletedSet.mockImplementation(async () => { throw { message: 'canceling statement', code: '57014' } })
    queueSet(1, 100)

    const error = await endWorkout()

    expect(error).toEqual(expect.objectContaining({ reason: UNSAVED_SETS_REASON.NETWORK, count: 1 }))
    expect(state().pendingSets[`${SE}-1`].failed).toBeUndefined()
    expect(endFlowCalls()).toEqual([])
  })
})
