import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createJSONStorage } from 'zustand/middleware'

vi.mock('../api/completedSetsApi.js', () => ({
  upsertCompletedSet: vi.fn(),
  deleteCompletedSet: vi.fn(),
}))

vi.mock('../haptics.js', () => {
  const onSetComplete = vi.fn()
  return { getHaptics: () => ({ onSetComplete }), _onSetComplete: onSetComplete }
})

import { upsertCompletedSet, deleteCompletedSet } from '../api/completedSetsApi.js'
import * as hapticsMock from '../haptics.js'
import { createWorkoutStore } from '../stores/createWorkoutStore.js'
import { initStores } from './_stores.js'
import { drainPendingSets } from '../lib/pendingSetsSync.js'
import { SYNC_RETRY_INTERVAL_MS } from '../lib/constants.js'
import {
  useCompleteSet,
  useUncompleteSet,
  useUpdateCompletedSet,
  useUpdateSetDetails,
  useUpdateSetVideo,
  useSyncPendingSets,
} from './useCompletedSets.js'

const SESSION = 7
const SE = 11
const KEY = `${SE}-1`
const networkError = () => ({ message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' })

function memStorage() {
  const raw = new Map()
  return createJSONStorage(() => ({
    getItem: (k) => (raw.has(k) ? raw.get(k) : null),
    setItem: (k, v) => { raw.set(k, v) },
    removeItem: (k) => { raw.delete(k) },
  }))
}

let store
let online

function state() {
  return store.getState()
}

function mutateWith(useHook, variables) {
  const { result } = renderHook(() => useHook())
  act(() => { result.current.mutate(variables) })
}

beforeEach(async () => {
  await drainPendingSets()
  vi.clearAllMocks()
  online = true
  upsertCompletedSet.mockReset().mockImplementation(async (payload) => {
    if (!online) throw networkError()
    return { id: `row-${payload.setNumber}` }
  })
  deleteCompletedSet.mockReset().mockImplementation(async () => {
    if (!online) throw networkError()
  })
  store = createWorkoutStore(memStorage())
  initStores({ authStore: null, workoutStore: store })
  state().startSession(SESSION, null)
})

describe('useCompleteSet', () => {
  it('checks the set at once, fires the haptic, and the queue upserts it', async () => {
    mutateWith(useCompleteSet, { sessionExerciseId: SE, setNumber: 1, weight: 100, repsCompleted: 8, rirActual: 2 })

    expect(state().completedSets[KEY]).toEqual(expect.objectContaining({ weight: 100, repsCompleted: 8, dbId: null }))
    expect(hapticsMock._onSetComplete).toHaveBeenCalledTimes(1)
    expect(state().pendingSets[KEY]).toBeDefined()

    await drainPendingSets()
    expect(upsertCompletedSet).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: SESSION, sessionExerciseId: SE, setNumber: 1, weight: 100, repsCompleted: 8, rirActual: 2,
      performedAt: state().completedSets[KEY].completedAt,
    }))
    expect(state().completedSets[KEY].dbId).toBe('row-1')
    expect(state().pendingSets).toEqual({})
  })

  // Item 4 of #179: the check is in persisted storage from the tap, whatever the network says.
  it('offline, the check stays and the set waits in the persisted queue', async () => {
    online = false
    mutateWith(useCompleteSet, { sessionExerciseId: SE, setNumber: 1, weight: 100 })
    await drainPendingSets()

    expect(state().completedSets[KEY]).toBeDefined()
    expect(state().pendingSets[KEY]).toEqual(expect.objectContaining({ sessionId: SESSION, token: expect.any(String) }))
    expect(state().pendingSets[KEY].failed).toBeUndefined()
  })

  it('keeps the same mutate across renders', () => {
    const { result, rerender } = renderHook(() => useCompleteSet())
    const first = result.current.mutate
    rerender()
    expect(result.current.mutate).toBe(first)
  })
})

describe('useUncompleteSet', () => {
  // Item 3 of #179: unchecking offline used to leave the check on, with no message.
  it('unchecks at once, also offline, and the queue deletes the row when it can', async () => {
    mutateWith(useCompleteSet, { sessionExerciseId: SE, setNumber: 1, weight: 100 })
    await drainPendingSets()
    online = false

    mutateWith(useUncompleteSet, { sessionExerciseId: SE, setNumber: 1 })
    expect(state().completedSets[KEY]).toBeUndefined()
    await drainPendingSets()
    expect(state().pendingSets[KEY]).toBeDefined()

    online = true
    deleteCompletedSet.mockClear()
    await drainPendingSets()
    expect(deleteCompletedSet).toHaveBeenCalledWith({ sessionId: SESSION, sessionExerciseId: SE, setNumber: 1 })
    expect(state().pendingSets).toEqual({})
  })
})

describe('useUpdateCompletedSet', () => {
  it('edits the values in place and upserts them with the original time', async () => {
    mutateWith(useCompleteSet, { sessionExerciseId: SE, setNumber: 1, weight: 100, repsCompleted: 8 })
    await drainPendingSets()
    const { completedAt } = state().completedSets[KEY]
    upsertCompletedSet.mockClear()

    mutateWith(useUpdateCompletedSet, { sessionExerciseId: SE, setNumber: 1, weight: 102, repsCompleted: 8 })
    await drainPendingSets()

    expect(state().completedSets[KEY].weight).toBe(102)
    expect(upsertCompletedSet).toHaveBeenCalledWith(expect.objectContaining({ weight: 102, performedAt: completedAt }))
  })

  it('on a set that is not checked, sends nothing', async () => {
    mutateWith(useUpdateCompletedSet, { sessionExerciseId: SE, setNumber: 1, weight: 102 })
    await drainPendingSets()

    expect(state().pendingSets).toEqual({})
    expect(upsertCompletedSet).not.toHaveBeenCalled()
    expect(deleteCompletedSet).not.toHaveBeenCalled()
  })
})

describe('useUpdateSetDetails', () => {
  // Acceptance 11 of #179: the old UPDATE hit no row while the upsert was still queued.
  it('on a set whose upsert has not landed, the upsert that lands carries the new RIR and notes', async () => {
    online = false
    mutateWith(useCompleteSet, { sessionExerciseId: SE, setNumber: 1, weight: 100, repsCompleted: 8, rirActual: null })
    await drainPendingSets()

    mutateWith(useUpdateSetDetails, { sessionExerciseId: SE, setNumber: 1, rirActual: 1, notes: 'heavy', setType: 'dropset' })
    await drainPendingSets()

    online = true
    upsertCompletedSet.mockClear()
    await drainPendingSets()
    expect(upsertCompletedSet).toHaveBeenCalledTimes(1)
    expect(upsertCompletedSet).toHaveBeenCalledWith(expect.objectContaining({
      weight: 100, rirActual: 1, notes: 'heavy', setType: 'dropset',
    }))
    expect(state().pendingSets).toEqual({})
  })

  it('on a set that is not checked, sends nothing', async () => {
    mutateWith(useUpdateSetDetails, { sessionExerciseId: SE, setNumber: 1, rirActual: 1, notes: null })
    await drainPendingSets()
    expect(upsertCompletedSet).not.toHaveBeenCalled()
  })
})

describe('useUpdateSetVideo', () => {
  it('stores the video and the queued upsert carries it, also to remove it', async () => {
    mutateWith(useCompleteSet, { sessionExerciseId: SE, setNumber: 1, weight: 100 })
    await drainPendingSets()
    upsertCompletedSet.mockClear()

    mutateWith(useUpdateSetVideo, { sessionExerciseId: SE, setNumber: 1, videoUrl: 'videos/a.mp4' })
    await drainPendingSets()
    expect(state().completedSets[KEY].videoUrl).toBe('videos/a.mp4')
    expect(upsertCompletedSet).toHaveBeenLastCalledWith(expect.objectContaining({ videoUrl: 'videos/a.mp4' }))

    mutateWith(useUpdateSetVideo, { sessionExerciseId: SE, setNumber: 1, videoUrl: null })
    await drainPendingSets()
    expect(upsertCompletedSet).toHaveBeenLastCalledWith(expect.objectContaining({ videoUrl: null }))
  })
})

describe('useSyncPendingSets', () => {
  function queueOffline() {
    online = false
    mutateWith(useCompleteSet, { sessionExerciseId: SE, setNumber: 1, weight: 100 })
    return drainPendingSets()
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('subscribes to visibility and connectivity, and unsubscribes on unmount', () => {
    const offVisibility = vi.fn()
    const offConnectivity = vi.fn()
    const onVisibilityChange = vi.fn(() => offVisibility)
    const onConnectivityChange = vi.fn(() => offConnectivity)

    const { unmount } = renderHook(() => useSyncPendingSets({ onVisibilityChange, onConnectivityChange }))
    expect(onVisibilityChange).toHaveBeenCalledWith(expect.any(Function))
    expect(onConnectivityChange).toHaveBeenCalledWith(expect.any(Function))

    unmount()
    expect(offVisibility).toHaveBeenCalledOnce()
    expect(offConnectivity).toHaveBeenCalledOnce()
  })

  it('works without platform callbacks', () => {
    expect(() => renderHook(() => useSyncPendingSets())).not.toThrow()
  })

  it('drains the queue when the app comes back to the foreground', async () => {
    await queueOffline()
    let onVisible
    renderHook(() => useSyncPendingSets({ onVisibilityChange: (cb) => { onVisible = cb; return () => {} } }))
    await drainPendingSets()

    online = true
    upsertCompletedSet.mockClear()
    await act(async () => { await onVisible() })
    expect(upsertCompletedSet).toHaveBeenCalledTimes(1)
    expect(state().pendingSets).toEqual({})
  })

  it('drains the queue when the connection returns', async () => {
    await queueOffline()
    let onOnline
    renderHook(() => useSyncPendingSets({ onConnectivityChange: (cb) => { onOnline = cb; return () => {} } }))
    await drainPendingSets()

    online = true
    await act(async () => { await onOnline() })
    expect(state().pendingSets).toEqual({})
  })

  it('retries on an interval while sets are queued', async () => {
    await queueOffline()
    vi.useFakeTimers()
    renderHook(() => useSyncPendingSets())
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    online = true
    upsertCompletedSet.mockClear()
    await act(async () => { await vi.advanceTimersByTimeAsync(SYNC_RETRY_INTERVAL_MS) })
    expect(upsertCompletedSet).toHaveBeenCalledTimes(1)
    expect(state().pendingSets).toEqual({})
  })

  it('returns how many queued sets a drain will still try', async () => {
    await queueOffline()
    state().markSetDirty(SE, 2)
    state().markPendingSetFailed(SE, 2, state().pendingSets[`${SE}-2`].token)

    const { result } = renderHook(() => useSyncPendingSets())
    expect(result.current).toBe(1)
  })
})
