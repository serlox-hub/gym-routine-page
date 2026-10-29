import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createJSONStorage } from 'zustand/middleware'

vi.mock('../api/completedSetsApi.js', () => ({
  upsertCompletedSet: vi.fn(),
  deleteCompletedSet: vi.fn(),
}))

import { upsertCompletedSet, deleteCompletedSet } from '../api/completedSetsApi.js'
import { createWorkoutStore } from '../stores/createWorkoutStore.js'
import { initStores } from '../hooks/_stores.js'
import { queryClient } from './queryClient.js'
import { QUERY_KEYS, SLOW_PENDING_MS } from './constants.js'
import {
  drainPendingSets,
  buildUpsertPayloadFromStore,
  isRetryableError,
  countPendingSets,
  getUnsavedSetsError,
  describeEndSessionError,
  createPendingSetToken,
  getPendingSetToken,
  UnsavedSetsError,
  UNSAVED_SETS_REASON,
  LEGACY_PENDING_SET_TOKEN,
  SET_SYNC_STATUS,
  worstSetSyncStatus,
  getSyncStatus,
  getSetWaitingSince,
  getExerciseWaitingSince,
  hasRejectedExerciseSet,
  getMsUntilSyncSlow,
  getSetSyncLabelKey,
  getExerciseSyncLabelKey,
} from './pendingSetsSync.js'

const SESSION = 7
const SE = 11
const KEY_1 = `${SE}-1`
const KEY_2 = `${SE}-2`

// What postgrest-js returns for a fetch that never got an answer, and for one the server rejected.
const networkError = () => ({ message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' })
const serverError = (code) => ({ message: 'rejected', details: null, hint: null, code })

function memStorage() {
  const raw = new Map()
  return createJSONStorage(() => ({
    getItem: (k) => (raw.has(k) ? raw.get(k) : null),
    setItem: (k, v) => { raw.set(k, v) },
    removeItem: (k) => { raw.delete(k) },
  }))
}

function deferred() {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

let store
// Every request, in order: ['upsert', payload] or ['delete', args].
let calls
let online

function state() {
  return store.getState()
}

// What the set hooks do on a tap: change the store, mark the set, kick the drainer.
function check(setNumber, data = { weight: 100, repsCompleted: 8 }) {
  state().completeSet(SE, setNumber, data)
  state().markSetDirty(SE, setNumber)
  return drainPendingSets()
}

function uncheck(setNumber) {
  state().uncompleteSet(SE, setNumber)
  state().markSetDirty(SE, setNumber)
  return drainPendingSets()
}

/** Holds the next upsert (or delete) until `release()`; `started` resolves once it is sent. */
function holdNext(apiMock) {
  const gate = deferred()
  const started = deferred()
  const fallback = apiMock.getMockImplementation()
  apiMock.mockImplementationOnce(async (args) => {
    started.resolve()
    await gate.promise
    return fallback(args)
  })
  return { started: started.promise, release: gate.resolve }
}

beforeEach(async () => {
  // A drain left running by a previous test would pick up this test's queue.
  await drainPendingSets()
  vi.restoreAllMocks()
  calls = []
  online = true
  upsertCompletedSet.mockReset().mockImplementation(async (payload) => {
    calls.push(['upsert', payload])
    if (!online) throw networkError()
    return { id: `row-${payload.sessionExerciseId}-${payload.setNumber}` }
  })
  deleteCompletedSet.mockReset().mockImplementation(async (args) => {
    calls.push(['delete', args])
    if (!online) throw networkError()
  })
  store = createWorkoutStore(memStorage())
  initStores({ authStore: null, workoutStore: store })
  state().startSession(SESSION, null)
})

// ============================================
// Pure helpers
// ============================================

describe('buildUpsertPayloadFromStore', () => {
  it('sends the store data, with the time the set was done as performedAt', () => {
    const entry = { sessionId: SESSION, sessionExerciseId: SE, setNumber: 2, token: 't' }
    const setData = {
      weight: 80, repsCompleted: 10, rirActual: 1, notes: 'ok', videoUrl: 'v.mp4', setType: 'dropset',
      completedAt: '2026-10-01T10:00:00.000Z', dbId: 'ignored', weightUnit: 'kg',
    }
    expect(buildUpsertPayloadFromStore(entry, setData)).toEqual({
      sessionId: SESSION,
      sessionExerciseId: SE,
      setNumber: 2,
      weight: 80,
      repsCompleted: 10,
      timeSeconds: undefined,
      distanceMeters: undefined,
      paceSeconds: undefined,
      level: undefined,
      caloriesBurned: undefined,
      rirActual: 1,
      notes: 'ok',
      videoUrl: 'v.mp4',
      setType: 'dropset',
      performedAt: '2026-10-01T10:00:00.000Z',
    })
  })

  it('takes the session from the entry, not from the set data', () => {
    const payload = buildUpsertPayloadFromStore({ sessionId: 99, sessionExerciseId: SE, setNumber: 1 }, { sessionId: 1 })
    expect(payload.sessionId).toBe(99)
  })

  // A set restored from the server has no local time: the upsert must not send one.
  it('leaves performedAt undefined for a set without completedAt', () => {
    const payload = buildUpsertPayloadFromStore({ sessionId: 1, sessionExerciseId: SE, setNumber: 1 }, { weight: 50 })
    expect(payload.performedAt).toBeUndefined()
  })
})

describe('isRetryableError', () => {
  it('is retryable without an answer from the server', () => {
    expect(isRetryableError(networkError())).toBe(true)
    expect(isRetryableError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isRetryableError({ message: '<html>502</html>' })).toBe(true)
  })

  it('is retryable with a temporary server error', () => {
    for (const code of ['PGRST000', 'PGRST003', 'PGRST301', 'PGRST303', '08006', '40001', '40P01', '53300', '57014', '57P01', '58030']) {
      expect(isRetryableError(serverError(code))).toBe(true)
    }
  })

  it('is not with a rejection, or without an error', () => {
    expect(isRetryableError(serverError('23503'))).toBe(false)
    expect(isRetryableError(serverError('23514'))).toBe(false)
    expect(isRetryableError(serverError('22003'))).toBe(false)
    expect(isRetryableError(serverError('PGRST116'))).toBe(false)
    expect(isRetryableError(serverError('PGRST204'))).toBe(false)
    expect(isRetryableError(null)).toBe(false)
    expect(isRetryableError(undefined)).toBe(false)
  })
})

describe('countPendingSets', () => {
  it('splits sendable from failed entries', () => {
    expect(countPendingSets({ a: { token: '1' }, b: { token: '2', failed: true }, c: { weight: 1 } }))
      .toEqual({ sendable: 2, failed: 1 })
  })

  it('counts nothing for an empty or missing queue', () => {
    expect(countPendingSets({})).toEqual({ sendable: 0, failed: 0 })
    expect(countPendingSets(undefined)).toEqual({ sendable: 0, failed: 0 })
  })
})

describe('getUnsavedSetsError', () => {
  it('lets the end go on with an empty queue', () => {
    expect(getUnsavedSetsError({})).toBeNull()
  })

  it('waits for signal while any set can still be sent, counting every unsaved set', () => {
    const error = getUnsavedSetsError({ a: { token: '1' }, b: { token: '2', failed: true } }, { discardUnsavedSets: true })
    expect(error).toBeInstanceOf(UnsavedSetsError)
    expect(error.reason).toBe(UNSAVED_SETS_REASON.NETWORK)
    expect(error.count).toBe(2)
  })

  it('with only rejected sets, offers to finish without them', () => {
    const error = getUnsavedSetsError({ a: { token: '1', failed: true } })
    expect(error.reason).toBe(UNSAVED_SETS_REASON.REJECTED)
    expect(error.count).toBe(1)
  })

  it('goes on once the user chose to finish without the rejected sets', () => {
    expect(getUnsavedSetsError({ a: { token: '1', failed: true } }, { discardUnsavedSets: true })).toBeNull()
  })
})

describe('describeEndSessionError', () => {
  it('is null without an error', () => {
    expect(describeEndSessionError(null)).toBeNull()
  })

  it('network: how many sets are not saved yet, with nothing to discard', () => {
    expect(describeEndSessionError(new UnsavedSetsError({ count: 3, reason: UNSAVED_SETS_REASON.NETWORK }))).toEqual({
      key: 'workout:session.unsavedSetsNetwork',
      params: { count: 3 },
      discardableSetsCount: 0,
    })
  })

  it('rejected: the sets the user can finish without', () => {
    expect(describeEndSessionError(new UnsavedSetsError({ count: 2, reason: UNSAVED_SETS_REASON.REJECTED }))).toEqual({
      key: 'workout:session.unsavedSetsRejected',
      params: { count: 2 },
      discardableSetsCount: 2,
    })
  })

  it('any other error keeps the generic message', () => {
    expect(describeEndSessionError(new Error('boom'))).toEqual({ key: 'workout:session.endFailed', discardableSetsCount: 0 })
  })
})

// ============================================
// Sync state shown on the set and the card (issue #210)
// ============================================

describe('worstSetSyncStatus', () => {
  const { NONE, SLOW, REJECTED } = SET_SYNC_STATUS

  it.each([
    [[], NONE],
    [[NONE], NONE],
    [[SLOW], SLOW],
    [[REJECTED], REJECTED],
    [[NONE, NONE], NONE],
    [[NONE, SLOW], SLOW],
    [[SLOW, NONE], SLOW],
    [[NONE, REJECTED], REJECTED],
    [[REJECTED, NONE], REJECTED],
    [[SLOW, REJECTED], REJECTED],
    [[REJECTED, SLOW], REJECTED],
    [[NONE, SLOW, REJECTED], REJECTED],
  ])('%j is %s', (statuses, expected) => {
    expect(worstSetSyncStatus(statuses)).toBe(expected)
  })

  it('is none for a missing list', () => {
    expect(worstSetSyncStatus(undefined)).toBe(NONE)
  })
})

describe('getSetWaitingSince', () => {
  it('is the mark of a sendable entry', () => {
    expect(getSetWaitingSince({ token: '1', markedAt: 1000 })).toBe(1000)
  })

  it('is null when no drain will send it', () => {
    expect(getSetWaitingSince(undefined)).toBeNull()
    expect(getSetWaitingSince({ token: '1', markedAt: 1000, failed: true })).toBeNull()
  })

  it('is older than any mark for an entry persisted before markedAt existed', () => {
    expect(getSetWaitingSince({ token: '1' })).toBe(-Infinity)
  })
})

describe('getExerciseWaitingSince and hasRejectedExerciseSet', () => {
  const OTHER_SE = SE + 1
  const queue = {
    [KEY_1]: { sessionExerciseId: SE, setNumber: 1, token: '1', markedAt: 3000 },
    [KEY_2]: { sessionExerciseId: SE, setNumber: 2, token: '2', markedAt: 2000 },
    [`${SE}-3`]: { sessionExerciseId: SE, setNumber: 3, token: '3', markedAt: 1000, failed: true },
    [`${OTHER_SE}-1`]: { sessionExerciseId: OTHER_SE, setNumber: 1, token: '4', markedAt: 500 },
  }

  it('the oldest mark among the sets still to send, ignoring rejected ones and other exercises', () => {
    expect(getExerciseWaitingSince(queue, SE)).toBe(2000)
  })

  it('a set persisted before markedAt existed is the oldest', () => {
    expect(getExerciseWaitingSince({ ...queue, [`${SE}-4`]: { sessionExerciseId: SE, setNumber: 4, token: 'x' } }, SE)).toBe(-Infinity)
  })

  it('null when nothing of the exercise is waiting', () => {
    expect(getExerciseWaitingSince({ [`${SE}-3`]: queue[`${SE}-3`] }, SE)).toBeNull()
    expect(getExerciseWaitingSince({}, SE)).toBeNull()
    expect(getExerciseWaitingSince(undefined, SE)).toBeNull()
  })

  it('a rejected set of the exercise, and only of the exercise', () => {
    expect(hasRejectedExerciseSet(queue, SE)).toBe(true)
    expect(hasRejectedExerciseSet(queue, OTHER_SE)).toBe(false)
    expect(hasRejectedExerciseSet(undefined, SE)).toBe(false)
  })
})

describe('getSyncStatus', () => {
  it('rejected wins over a set waiting past the threshold', () => {
    expect(getSyncStatus(true, 0, SLOW_PENDING_MS)).toBe(SET_SYNC_STATUS.REJECTED)
  })

  it('slow once the oldest wait reaches the threshold, and after it', () => {
    expect(getSyncStatus(false, 1000, 1000)).toBe(SET_SYNC_STATUS.NONE)
    expect(getSyncStatus(false, 1000, 1000 + SLOW_PENDING_MS - 1)).toBe(SET_SYNC_STATUS.NONE)
    expect(getSyncStatus(false, 1000, 1000 + SLOW_PENDING_MS)).toBe(SET_SYNC_STATUS.SLOW)
    expect(getSyncStatus(false, 1000, 1000 + 20 * SLOW_PENDING_MS)).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('slow at once for a set persisted before markedAt existed', () => {
    expect(getSyncStatus(false, getSetWaitingSince({ token: '1' }), 0)).toBe(SET_SYNC_STATUS.SLOW)
  })

  it('rejected at once for a failed set, with or without markedAt', () => {
    expect(getSyncStatus(true, getSetWaitingSince({ token: '1', markedAt: 1000, failed: true }), 1000)).toBe(SET_SYNC_STATUS.REJECTED)
    expect(getSyncStatus(true, getSetWaitingSince({ token: '1', failed: true }), 1000)).toBe(SET_SYNC_STATUS.REJECTED)
  })

  it('none with nothing waiting and nothing rejected', () => {
    expect(getSyncStatus(false, null, 1000)).toBe(SET_SYNC_STATUS.NONE)
  })
})

describe('getMsUntilSyncSlow', () => {
  it('is the time left until the threshold', () => {
    expect(getMsUntilSyncSlow(1000, 1000)).toBe(SLOW_PENDING_MS)
    expect(getMsUntilSyncSlow(1000, 1000 + SLOW_PENDING_MS - 1)).toBe(1)
  })

  it('is null once slow, or with nothing waiting', () => {
    expect(getMsUntilSyncSlow(1000, 1000 + SLOW_PENDING_MS)).toBeNull()
    expect(getMsUntilSyncSlow(-Infinity, 1000)).toBeNull()
    expect(getMsUntilSyncSlow(null, 1000)).toBeNull()
  })
})

describe('getSetSyncLabelKey and getExerciseSyncLabelKey', () => {
  it('name what happened to the set, or to some sets of the exercise', () => {
    expect(getSetSyncLabelKey(SET_SYNC_STATUS.SLOW)).toBe('workout:set.syncSlow')
    expect(getSetSyncLabelKey(SET_SYNC_STATUS.REJECTED)).toBe('workout:set.syncRejected')
    expect(getExerciseSyncLabelKey(SET_SYNC_STATUS.SLOW)).toBe('workout:exercise.syncSlow')
    expect(getExerciseSyncLabelKey(SET_SYNC_STATUS.REJECTED)).toBe('workout:exercise.syncRejected')
  })

  it('are null when nothing shows', () => {
    expect(getSetSyncLabelKey(SET_SYNC_STATUS.NONE)).toBeNull()
    expect(getExerciseSyncLabelKey(SET_SYNC_STATUS.NONE)).toBeNull()
    expect(getSetSyncLabelKey(undefined)).toBeNull()
  })
})

describe('tokens', () => {
  it('every token is new', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => createPendingSetToken()))
    expect(tokens.size).toBe(500)
  })

  it('an entry persisted before issue 179 (no token) reads as the legacy token', () => {
    expect(getPendingSetToken({ sessionId: 1, weight: 100 })).toBe(LEGACY_PENDING_SET_TOKEN)
    expect(getPendingSetToken({ token: 'abc' })).toBe('abc')
  })
})

// ============================================
// drainPendingSets (issue #179, acceptance 1 to 10)
// ============================================

describe('drainPendingSets', () => {
  it('upserts a checked set from the store, stores its row id and empties the queue', async () => {
    await check(1, { weight: 100, repsCompleted: 8 })

    expect(calls).toEqual([['upsert', expect.objectContaining({
      sessionId: SESSION, sessionExerciseId: SE, setNumber: 1, weight: 100, repsCompleted: 8,
      performedAt: state().completedSets[KEY_1].completedAt,
    })]])
    expect(state().completedSets[KEY_1].dbId).toBe(`row-${SE}-1`)
    expect(state().pendingSets).toEqual({})
  })

  it('1. check offline, uncheck, signal returns: the last call is a delete and no upsert follows', async () => {
    online = false
    await check(1)
    await uncheck(1)
    online = true
    await drainPendingSets()

    expect(calls.at(-1)).toEqual(['delete', { sessionId: SESSION, sessionExerciseId: SE, setNumber: 1 }])
    const lastUpsert = calls.map(([kind]) => kind).lastIndexOf('upsert')
    const firstDeleteAfterUncheck = calls.findIndex(([kind]) => kind === 'delete')
    expect(lastUpsert).toBeLessThan(firstDeleteAfterUncheck)
    expect(state().pendingSets).toEqual({})
  })

  it('2. uncheck offline: the check goes at once, the entry waits, and the next drain deletes', async () => {
    await check(1)
    online = false

    const drain = uncheck(1)
    expect(state().completedSets[KEY_1]).toBeUndefined()
    await drain
    expect(state().pendingSets[KEY_1]).toBeDefined()

    online = true
    deleteCompletedSet.mockClear()
    await drainPendingSets()
    expect(deleteCompletedSet).toHaveBeenCalledWith({ sessionId: SESSION, sessionExerciseId: SE, setNumber: 1 })
    expect(state().pendingSets).toEqual({})
  })

  it('3. check, then uncheck while the upsert is in flight: the entry stays and a delete follows', async () => {
    const upsert = holdNext(upsertCompletedSet)
    let entryWhenDeleting
    deleteCompletedSet.mockImplementationOnce(async (args) => {
      calls.push(['delete', args])
      entryWhenDeleting = state().pendingSets[KEY_1]
    })

    const drain = check(1)
    await upsert.started
    uncheck(1)
    upsert.release()
    await drain

    expect(calls.map(([kind]) => kind)).toEqual(['upsert', 'delete'])
    expect(entryWhenDeleting).toBeDefined()
    // The upsert's row id does not bring the set back.
    expect(state().completedSets[KEY_1]).toBeUndefined()
    expect(state().pendingSets).toEqual({})
  })

  it('4. uncheck, then re-check while the delete is in flight: it ends with an upsert and the set checked', async () => {
    await check(1)
    calls = []
    const del = holdNext(deleteCompletedSet)

    const drain = uncheck(1)
    await del.started
    check(1, { weight: 105, repsCompleted: 8 })
    del.release()
    await drain

    expect(calls.map(([kind]) => kind)).toEqual(['delete', 'upsert'])
    expect(calls.at(-1)[1].weight).toBe(105)
    expect(state().completedSets[KEY_1]).toEqual(expect.objectContaining({ weight: 105, dbId: `row-${SE}-1` }))
    expect(state().pendingSets).toEqual({})
  })

  it('5. two drains at once share one flight: one request per set, never two in parallel', async () => {
    let inFlight = 0
    let maxInFlight = 0
    upsertCompletedSet.mockImplementation(async (payload) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise(resolve => setTimeout(resolve, 5))
      inFlight -= 1
      return { id: payload.setNumber }
    })
    state().completeSet(SE, 1, { weight: 100 })
    state().completeSet(SE, 2, { weight: 100 })
    state().markSetDirty(SE, 1)
    state().markSetDirty(SE, 2)

    const first = drainPendingSets()
    const second = drainPendingSets()
    expect(second).toBe(first)
    await Promise.all([first, second])

    expect(upsertCompletedSet).toHaveBeenCalledTimes(2)
    expect(maxInFlight).toBe(1)
  })

  it('6. a legacy entry of a set still checked syncs once, from the store, and is removed', async () => {
    state().completeSet(SE, 1, { weight: 100, repsCompleted: 8 })
    store.setState({
      pendingSets: {
        [KEY_1]: { sessionId: SESSION, sessionExerciseId: SE, setNumber: 1, weight: 60, repsCompleted: 3, performedAt: 'old' },
      },
    })

    await drainPendingSets()

    expect(upsertCompletedSet).toHaveBeenCalledTimes(1)
    expect(upsertCompletedSet).toHaveBeenCalledWith(expect.objectContaining({
      weight: 100, repsCompleted: 8, performedAt: state().completedSets[KEY_1].completedAt,
    }))
    expect(state().pendingSets).toEqual({})
  })

  // The old queue kept the payload of a set the user had unchecked: it came back on the next sync.
  it('a legacy entry of a set no longer checked deletes the row', async () => {
    store.setState({ pendingSets: { [KEY_1]: { sessionId: SESSION, sessionExerciseId: SE, setNumber: 1, weight: 60 } } })

    await drainPendingSets()

    expect(calls).toEqual([['delete', { sessionId: SESSION, sessionExerciseId: SE, setNumber: 1 }]])
    expect(state().pendingSets).toEqual({})
  })

  it('7. clearExercise during an upsert, then the same set checked again: the new entry survives and is sent', async () => {
    const upsert = holdNext(upsertCompletedSet)

    const drain = check(1, { weight: 100 })
    await upsert.started
    state().clearExercise(SE)
    check(1, { weight: 40 })
    upsert.release()
    await drain

    expect(calls.map(([, payload]) => payload.weight)).toEqual([100, 40])
    expect(state().pendingSets).toEqual({})
  })

  it('8. a weight conversion during an upsert: the converted weight is sent after it', async () => {
    const upsert = holdNext(upsertCompletedSet)

    const drain = check(1, { weight: 190 })
    await upsert.started
    state().applyWeightConversions([{ sessionExerciseId: SE, setNumber: 1, newWeight: 86.18 }])
    upsert.release()
    await drain

    expect(calls.map(([, payload]) => payload.weight)).toEqual([190, 86.18])
    expect(state().pendingSets).toEqual({})
  })

  describe('9. server errors never block the other entries', () => {
    it('a foreign-key violation (23503) drops the entry and the next one is still sent', async () => {
      upsertCompletedSet.mockImplementationOnce(async (payload) => {
        calls.push(['upsert', payload])
        throw serverError('23503')
      })
      state().completeSet(SE, 1, { weight: 100 })
      state().completeSet(SE, 2, { weight: 100 })
      state().markSetDirty(SE, 1)
      state().markSetDirty(SE, 2)

      await drainPendingSets()

      expect(calls.map(([, payload]) => payload.setNumber)).toEqual([1, 2])
      expect(state().pendingSets).toEqual({})
    })

    it('another server error marks the entry failed, is not retried, and the next one is still sent', async () => {
      upsertCompletedSet.mockImplementationOnce(async (payload) => {
        calls.push(['upsert', payload])
        throw serverError('23514')
      })
      state().completeSet(SE, 1, { weight: 100 })
      state().completeSet(SE, 2, { weight: 100 })
      state().markSetDirty(SE, 1)
      state().markSetDirty(SE, 2)

      await drainPendingSets()

      expect(calls.map(([, payload]) => payload.setNumber)).toEqual([1, 2])
      expect(state().pendingSets[KEY_1].failed).toBe(true)
      expect(state().pendingSets[KEY_2]).toBeUndefined()
    })

    it('a failed entry is skipped until the set is marked again, which clears failed and sends it', async () => {
      upsertCompletedSet.mockImplementationOnce(async () => { throw serverError('23514') })
      await check(1)
      upsertCompletedSet.mockClear()

      await drainPendingSets()
      expect(upsertCompletedSet).not.toHaveBeenCalled()

      state().markSetDirty(SE, 1)
      expect(state().pendingSets[KEY_1].failed).toBeUndefined()
      await drainPendingSets()
      expect(upsertCompletedSet).toHaveBeenCalledTimes(1)
      expect(state().pendingSets).toEqual({})
    })
  })

  describe('10. network errors', () => {
    it('are retried once right away', async () => {
      upsertCompletedSet.mockImplementationOnce(async () => { throw networkError() })

      await check(1)

      expect(upsertCompletedSet).toHaveBeenCalledTimes(2)
      expect(state().pendingSets).toEqual({})
    })

    it('a second one stops the drain and leaves every entry as it was', async () => {
      online = false
      state().completeSet(SE, 1, { weight: 100 })
      state().completeSet(SE, 2, { weight: 100 })
      state().markSetDirty(SE, 1)
      state().markSetDirty(SE, 2)
      const before = state().pendingSets

      await drainPendingSets()

      expect(calls.map(([, payload]) => payload.setNumber)).toEqual([1, 1])
      expect(state().pendingSets).toEqual(before)
    })
  })

  // A temporary server answer (here a cancelled statement, 57014) says "not now", like no signal does.
  describe('10b. temporary server errors', () => {
    it('a repeated one stops the drain, leaves every entry sendable and marks none failed', async () => {
      upsertCompletedSet.mockImplementation(async (payload) => {
        calls.push(['upsert', payload])
        throw serverError('57014')
      })
      state().completeSet(SE, 1, { weight: 100 })
      state().completeSet(SE, 2, { weight: 100 })
      state().markSetDirty(SE, 1)
      state().markSetDirty(SE, 2)
      const before = state().pendingSets

      await drainPendingSets()

      // Set 1 twice (the immediate retry), and set 2 never reached.
      expect(calls.map(([, payload]) => payload.setNumber)).toEqual([1, 1])
      expect(state().pendingSets).toEqual(before)
      expect(countPendingSets(state().pendingSets)).toEqual({ sendable: 2, failed: 0 })
    })

    it('one that goes away on the immediate retry saves the set', async () => {
      upsertCompletedSet.mockImplementationOnce(async () => { throw serverError('57014') })

      await check(1)

      expect(upsertCompletedSet).toHaveBeenCalledTimes(2)
      expect(state().pendingSets).toEqual({})
    })

    it('the next drain sends the entry that a temporary error left queued', async () => {
      upsertCompletedSet.mockImplementation(async () => { throw serverError('PGRST000') })
      await check(1)
      expect(state().pendingSets[KEY_1].failed).toBeUndefined()

      upsertCompletedSet.mockReset().mockImplementation(async (payload) => ({ id: payload.setNumber }))
      await drainPendingSets()

      expect(upsertCompletedSet).toHaveBeenCalledTimes(1)
      expect(state().pendingSets).toEqual({})
    })
  })

  it('a set touched during every request is sent at most 3 times per drain, and stays queued', async () => {
    upsertCompletedSet.mockImplementation(async (payload) => {
      calls.push(['upsert', payload])
      state().markSetDirty(SE, 1)
      return { id: 1 }
    })
    state().completeSet(SE, 1, { weight: 100 })
    state().markSetDirty(SE, 1)

    await drainPendingSets()

    expect(upsertCompletedSet).toHaveBeenCalledTimes(3)
    expect(state().pendingSets[KEY_1]).toEqual(expect.objectContaining({ token: expect.any(String) }))
    expect(state().pendingSets[KEY_1].failed).toBeUndefined()
  })

  it('a set marked during the drain is sent by that same drain', async () => {
    const upsert = holdNext(upsertCompletedSet)

    const drain = check(1)
    await upsert.started
    check(2)
    upsert.release()
    await drain

    expect(calls.map(([, payload]) => payload.setNumber)).toEqual([1, 2])
    expect(state().pendingSets).toEqual({})
  })

  it('uses the session of the entry, not the current one', async () => {
    state().completeSet(SE, 1, { weight: 100 })
    state().markSetDirty(SE, 1)
    store.setState({ sessionId: 8 })

    await drainPendingSets()

    expect(upsertCompletedSet).toHaveBeenCalledWith(expect.objectContaining({ sessionId: SESSION }))
  })

  it('invalidates the completed sets queries once something was saved, and only then', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    online = false
    await check(1)
    expect(invalidate).not.toHaveBeenCalled()

    online = true
    await drainPendingSets()
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
  })

  // The slow-write diagnostic of #123 listens to the MutationCache.
  it('every request goes through the MutationCache of the shared queryClient', async () => {
    const actions = []
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated') actions.push(event.action.type)
    })

    await check(1)
    unsubscribe()

    expect(actions).toEqual(expect.arrayContaining(['pending', 'success']))
  })

  it('never rejects, and keeps the entry, when a store action throws', async () => {
    store.setState({ clearPendingSetIfToken: () => { throw new Error('boom') } })

    await expect(check(1)).resolves.toBeUndefined()
    expect(state().pendingSets[KEY_1]).toBeDefined()
  })

  it('does nothing with an empty queue', async () => {
    await drainPendingSets()
    expect(calls).toEqual([])
  })
})
