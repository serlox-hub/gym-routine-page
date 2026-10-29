import { useLayoutEffect } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createJSONStorage } from 'zustand/middleware'
import { initStores } from './_stores.js'
import { createWorkoutStore } from '../stores/createWorkoutStore.js'
import { SLOW_PENDING_MS } from '../lib/constants.js'
import { SET_SYNC_STATUS } from '../lib/pendingSetsSync.js'
import { useSetSyncStatus, useExerciseSyncStatus } from './useSetSyncStatus.js'

const SESSION = 7
const SE = 11
const OTHER_SE = 12
const START = 1_800_000_000_000

function memStorage() {
  const raw = new Map()
  return createJSONStorage(() => ({
    getItem: (k) => (raw.has(k) ? raw.get(k) : null),
    setItem: (k, v) => { raw.set(k, v) },
    removeItem: (k) => { raw.delete(k) },
  }))
}

let store

function state() {
  return store.getState()
}

function mark(sessionExerciseId, setNumber) {
  act(() => { state().markSetDirty(sessionExerciseId, setNumber) })
}

function tokenOf(sessionExerciseId, setNumber) {
  return state().pendingSets[`${sessionExerciseId}-${setNumber}`].token
}

function land(sessionExerciseId, setNumber) {
  act(() => { state().clearPendingSetIfToken(sessionExerciseId, setNumber, tokenOf(sessionExerciseId, setNumber)) })
}

function reject(sessionExerciseId, setNumber) {
  act(() => { state().markPendingSetFailed(sessionExerciseId, setNumber, tokenOf(sessionExerciseId, setNumber)) })
}

function wait(ms) {
  act(() => { vi.advanceTimersByTime(ms) })
}

/** Renders the hook counting its renders, to prove what does NOT re-render it. */
function renderCounted(useHook) {
  const renders = { count: 0 }
  const hook = renderHook(() => {
    renders.count += 1
    return useHook()
  })
  return { ...hook, renders }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
  store = createWorkoutStore(memStorage())
  initStores({ authStore: () => ({}), workoutStore: store })
  act(() => { state().startSession(SESSION, null) })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSetSyncStatus', () => {
  it('is none for a set that is not queued, however long it waits', () => {
    const { result } = renderHook(() => useSetSyncStatus(SE, 1))
    wait(SLOW_PENDING_MS * 2)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
  })

  it('a sendable set is none, and slow 5 s after its mark', () => {
    const { result } = renderHook(() => useSetSyncStatus(SE, 1))
    mark(SE, 1)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)

    wait(SLOW_PENDING_MS - 1)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
    wait(1)
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('mounting 20 s after the mark is slow on the first render', () => {
    mark(SE, 1)
    vi.setSystemTime(START + 20_000)

    const { result } = renderHook(() => useSetSyncStatus(SE, 1))

    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('the time counts from the mark, not from the mount', () => {
    mark(SE, 1)
    vi.setSystemTime(START + SLOW_PENDING_MS - 1000)
    const { result } = renderHook(() => useSetSyncStatus(SE, 1))
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)

    wait(1000)
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('a new mark goes back to none, and slow 5 s later', () => {
    const { result } = renderHook(() => useSetSyncStatus(SE, 1))
    mark(SE, 1)
    wait(SLOW_PENDING_MS)
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)

    mark(SE, 1)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
    wait(SLOW_PENDING_MS - 1)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
    wait(1)
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('a set that lands is none, before and after the threshold', () => {
    const { result } = renderHook(() => useSetSyncStatus(SE, 1))
    mark(SE, 1)
    wait(SLOW_PENDING_MS)
    land(SE, 1)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)

    mark(SE, 1)
    land(SE, 1)
    wait(SLOW_PENDING_MS)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a rejected set is rejected at once', () => {
    const { result } = renderHook(() => useSetSyncStatus(SE, 1))
    mark(SE, 1)
    reject(SE, 1)
    expect(result.current).toBe(SET_SYNC_STATUS.REJECTED)
  })

  it('an entry persisted before markedAt existed is slow at once', () => {
    act(() => { store.setState({ pendingSets: { [`${SE}-1`]: { sessionId: SESSION, sessionExerciseId: SE, setNumber: 1, token: 'x' } } }) })
    const { result } = renderHook(() => useSetSyncStatus(SE, 1))
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('another set changing does not re-render it', () => {
    mark(SE, 1)
    const { result, renders } = renderCounted(() => useSetSyncStatus(SE, 1))
    const before = renders.count

    mark(SE, 2)
    reject(SE, 2)
    mark(OTHER_SE, 1)
    land(OTHER_SE, 1)

    expect(renders.count).toBe(before)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
  })

  it('leaves no timer behind after unmount', () => {
    mark(SE, 1)
    const { unmount } = renderHook(() => useSetSyncStatus(SE, 1))
    expect(vi.getTimerCount()).toBe(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('turns slow when the threshold passes between the render and its effect, and leaves no timer', () => {
    mark(SE, 1)
    // The render reads the clock 1 ms short of the threshold and paints none. The layout effect
    // below runs after that render and before the passive effect that arms the timer, so by then
    // the threshold is already behind.
    vi.setSystemTime(START + SLOW_PENDING_MS - 1)
    const { result } = renderHook(() => {
      useLayoutEffect(() => { vi.setSystemTime(START + SLOW_PENDING_MS + 1) }, [])
      return useSetSyncStatus(SE, 1)
    })
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)

    wait(0)

    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('useExerciseSyncStatus', () => {
  it('is none with nothing of the exercise queued', () => {
    mark(OTHER_SE, 1)
    const { result } = renderHook(() => useExerciseSyncStatus(SE))
    wait(SLOW_PENDING_MS)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
  })

  it('turns slow 5 s after the oldest of its sets still to send', () => {
    const { result } = renderHook(() => useExerciseSyncStatus(SE))
    mark(SE, 1)
    wait(3000)
    mark(SE, 2)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)

    wait(SLOW_PENDING_MS - 3000)
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('when the oldest lands, counts from the next one', () => {
    const { result } = renderHook(() => useExerciseSyncStatus(SE))
    mark(SE, 1)
    wait(3000)
    mark(SE, 2)
    wait(SLOW_PENDING_MS - 3000)
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)

    land(SE, 1)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
    wait(3000)
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('mounting 20 s after the marks is slow on the first render', () => {
    mark(SE, 1)
    mark(SE, 2)
    vi.setSystemTime(START + 20_000)

    const { result } = renderHook(() => useExerciseSyncStatus(SE))

    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('a re-marked set goes back to none, and slow 5 s later', () => {
    const { result } = renderHook(() => useExerciseSyncStatus(SE))
    mark(SE, 1)
    wait(SLOW_PENDING_MS)
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)

    mark(SE, 1)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
    wait(SLOW_PENDING_MS)
    expect(result.current).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('a rejected set wins over a slow one, at once', () => {
    const { result } = renderHook(() => useExerciseSyncStatus(SE))
    mark(SE, 1)
    mark(SE, 2)
    reject(SE, 2)
    expect(result.current).toBe(SET_SYNC_STATUS.REJECTED)

    wait(SLOW_PENDING_MS)
    expect(result.current).toBe(SET_SYNC_STATUS.REJECTED)
  })

  it('is none once every set is cleared', () => {
    const { result } = renderHook(() => useExerciseSyncStatus(SE))
    mark(SE, 1)
    mark(SE, 2)
    reject(SE, 2)
    wait(SLOW_PENDING_MS)

    land(SE, 1)
    act(() => { state().discardFailedPendingSets() })

    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
  })

  it('another exercise changing, or a newer mark behind the oldest, does not re-render it', () => {
    mark(SE, 1)
    const { result, renders } = renderCounted(() => useExerciseSyncStatus(SE))
    const before = renders.count

    wait(1000)
    mark(SE, 2)
    mark(OTHER_SE, 1)
    reject(OTHER_SE, 1)

    expect(renders.count).toBe(before)
    expect(result.current).toBe(SET_SYNC_STATUS.NONE)
  })
})
