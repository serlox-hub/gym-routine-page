import { MutationObserver } from '@tanstack/react-query'
import { upsertCompletedSet, deleteCompletedSet } from '../api/completedSetsApi.js'
import { getWorkoutStore } from '../hooks/_stores.js'
import { queryClient } from './queryClient.js'
import { QUERY_KEYS } from './constants.js'

// The sync queue of the active session's sets (issue #179). Checking, editing and unchecking a set
// update the store and mark the set in `pendingSets`; nothing else sends a set's state to the
// server. An entry says "this set changed", not what to send: the drainer reads the store at send
// time, so the latest thing the user did always wins and an uncheck can never be undone by an
// older upsert still in the queue.

// Entries persisted before #179 carry the whole upsert payload and no token. They are matched by
// this token, and only their identity is read: what to send comes from the store, as for any entry.
export const LEGACY_PENDING_SET_TOKEN = 'legacy'

// A user touching the same set while its request is in flight makes the drainer send it again.
// The cap keeps a set touched over and over from holding the drain (and the end of the workout)
// forever; what is left over stays queued for the next trigger.
const MAX_SENDS_PER_SET_PER_DRAIN = 3

// The exercise or the session no longer exists on the server: no row can ever exist for that set.
const FOREIGN_KEY_VIOLATION = '23503'

export const UNSAVED_SETS_REASON = {
  // The drain stopped on a network (or temporary server) error: the sets may still be saved later.
  NETWORK: 'network',
  // The server answered with an error: retrying the same data will not help.
  REJECTED: 'rejected',
}

/** Thrown by `useEndSession` when sets are still queued after draining. */
export class UnsavedSetsError extends Error {
  constructor({ count, reason }) {
    super(`unsaved_sets_${reason}`)
    this.name = 'UnsavedSetsError'
    this.count = count
    this.reason = reason
  }
}

let tokenSequence = 0

/**
 * A fresh id for every mark. Never a per-set counter: `clearExercise` drops the entry, and a
 * counter starting over could hand a new mark the token an older request is still holding.
 */
export function createPendingSetToken() {
  tokenSequence += 1
  return `${Date.now().toString(36)}-${tokenSequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getPendingSetToken(entry) {
  return entry?.token ?? LEGACY_PENDING_SET_TOKEN
}

/**
 * Upsert payload for a queued set, from the store's current data. The session comes from the
 * entry, never from the store. Fields the exercise does not track are `undefined` in the store and
 * drop out of the body, so the upsert leaves those columns alone (see `upsertCompletedSet`).
 */
export function buildUpsertPayloadFromStore(entry, setData) {
  return {
    sessionId: entry.sessionId,
    sessionExerciseId: entry.sessionExerciseId,
    setNumber: entry.setNumber,
    weight: setData.weight,
    repsCompleted: setData.repsCompleted,
    timeSeconds: setData.timeSeconds,
    distanceMeters: setData.distanceMeters,
    paceSeconds: setData.paceSeconds,
    level: setData.level,
    caloriesBurned: setData.caloriesBurned,
    rirActual: setData.rirActual,
    notes: setData.notes,
    videoUrl: setData.videoUrl,
    setType: setData.setType,
    // The time the set was done, not the time it synced. A set restored from the server has none,
    // and then the stored one is kept.
    performedAt: setData.completedAt,
  }
}

// Server answers that say "not now" rather than "never": the database unreachable or its pool
// exhausted (PGRST0xx), an expired or unreadable JWT that the client refreshes (PGRST3xx), and the
// SQLSTATE classes of a lost connection (08), a rolled back transaction such as a deadlock (40), no
// resources (53), a cancelled statement such as a timeout (57) and a system error (58). Marking those
// `failed` would leave a set nothing retries, with "finish without them" as the only way out.
const TRANSIENT_ERROR_CODE = /^(PGRST[03]\d\d|08|40|53|57|58)/

/**
 * Whether sending the same write again later can succeed: a failed fetch (postgrest-js gives it
 * an empty `code`, a server answer always carries one), or a server error that is temporary.
 */
export function isRetryableError(error) {
  if (!error) return false
  if (error instanceof TypeError) return true
  if (!error.code) return true
  return TRANSIENT_ERROR_CODE.test(error.code)
}

/** Queued sets split by whether a drain will still try them. */
export function countPendingSets(pendingSets) {
  let sendable = 0
  let failed = 0
  for (const entry of Object.values(pendingSets ?? {})) {
    if (entry?.failed) failed += 1
    else sendable += 1
  }
  return { sendable, failed }
}

/**
 * What ending the workout must do about the sets still queued after draining (owner's decision,
 * issue #179): with any set still sendable, wait for signal; with only rejected ones, let the user
 * finish without them. Returns the error to throw, or null to go on.
 */
export function getUnsavedSetsError(pendingSets, { discardUnsavedSets = false } = {}) {
  const { sendable, failed } = countPendingSets(pendingSets)
  if (sendable > 0) return new UnsavedSetsError({ count: sendable + failed, reason: UNSAVED_SETS_REASON.NETWORK })
  if (failed > 0 && !discardUnsavedSets) return new UnsavedSetsError({ count: failed, reason: UNSAVED_SETS_REASON.REJECTED })
  return null
}

/**
 * Message of a failed end of workout for the end modal, and how many rejected sets it offers to
 * finish without (0: no such offer).
 * @returns {{ key: string, params?: Object, discardableSetsCount: number } | null}
 */
export function describeEndSessionError(error) {
  if (!error) return null
  if (error instanceof UnsavedSetsError) {
    const rejected = error.reason === UNSAVED_SETS_REASON.REJECTED
    return {
      key: rejected ? 'workout:session.unsavedSetsRejected' : 'workout:session.unsavedSetsNetwork',
      params: { count: error.count },
      discardableSetsCount: rejected ? error.count : 0,
    }
  }
  return { key: 'workout:session.endFailed', discardableSetsCount: 0 }
}

function pickNextPendingSet(pendingSets, sendsByKey) {
  for (const [key, entry] of Object.entries(pendingSets ?? {})) {
    if (!entry || entry.failed) continue
    if ((sendsByKey.get(key) ?? 0) >= MAX_SENDS_PER_SET_PER_DRAIN) continue
    return {
      key,
      sessionId: entry.sessionId,
      sessionExerciseId: entry.sessionExerciseId,
      setNumber: entry.setNumber,
      token: getPendingSetToken(entry),
    }
  }
  return null
}

/**
 * One request through TanStack, so it shows up in the `MutationCache` (the slow-write diagnostic
 * of #123 listens there). `networkMode: 'always'` sends it even when the browser believes it is
 * offline: the queue already waits, a paused mutation would only hold the drain. One immediate
 * retry, and only when retrying can help (isRetryableError): a dead reused connection on Safari
 * recovers in ~150 ms on retry (#121), a rejection would just repeat.
 */
function runSetWrite(request) {
  const observer = new MutationObserver(queryClient, {
    mutationFn: request,
    networkMode: 'always',
    retry: (failureCount, error) => failureCount < 1 && isRetryableError(error),
    retryDelay: 0,
  })
  // Without the reset the observer keeps the finished mutation in the cache for good.
  return observer.mutate().finally(() => observer.reset())
}

const SEND_RESULT = { SAVED: 'saved', REJECTED: 'rejected', STOP: 'stop' }

async function sendPendingSet(entry) {
  const store = getWorkoutStore()
  const { sessionId, sessionExerciseId, setNumber, token } = entry
  const setData = store.getState().completedSets[entry.key]
  const isUpsert = Boolean(setData)
  try {
    const row = await runSetWrite(isUpsert
      ? () => upsertCompletedSet(buildUpsertPayloadFromStore(entry, setData))
      : () => deleteCompletedSet({ sessionId, sessionExerciseId, setNumber }))
    const state = store.getState()
    // updateSetDbId does nothing if the set was unchecked meanwhile.
    if (isUpsert && row?.id && state.sessionId === sessionId) state.updateSetDbId(sessionExerciseId, setNumber, row.id)
    // A new token means the user touched the set during the request: it stays and is sent again.
    state.clearPendingSetIfToken(sessionExerciseId, setNumber, token)
    return SEND_RESULT.SAVED
  } catch (error) {
    if (isRetryableError(error)) return SEND_RESULT.STOP
    const state = store.getState()
    if (isUpsert && error?.code === FOREIGN_KEY_VIOLATION) state.clearPendingSetIfToken(sessionExerciseId, setNumber, token)
    else state.markPendingSetFailed(sessionExerciseId, setNumber, token)
    return SEND_RESULT.REJECTED
  }
}

let drainInFlight = null

async function runDrain() {
  let saved = 0
  try {
    const sendsByKey = new Map()
    for (;;) {
      const entry = pickNextPendingSet(getWorkoutStore().getState().pendingSets, sendsByKey)
      if (!entry) break
      sendsByKey.set(entry.key, (sendsByKey.get(entry.key) ?? 0) + 1)
      const result = await sendPendingSet(entry)
      if (result === SEND_RESULT.STOP) break
      if (result === SEND_RESULT.SAVED) saved += 1
    }
  } catch {
    // Never rejects: whatever is still queued goes out on the next trigger.
  } finally {
    if (saved > 0) queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLETED_SETS] })
    // Cleared in the same step the loop finds nothing left, so a mark arriving after it starts a
    // new drain instead of getting a promise that has already stopped looking.
    drainInFlight = null
  }
}

/**
 * Sends the queued sets one request at a time. Single flight: a call while a drain runs gets that
 * drain, which re-reads the queue after every request and so also sends what was marked meanwhile.
 * A retryable error stops the drain, keeping the queue as is; a rejection marks only that entry
 * `failed` (or drops it, see FOREIGN_KEY_VIOLATION) and the drain goes on. Never rejects.
 * @returns {Promise<void>}
 */
export function drainPendingSets() {
  // Started on a microtask so `drainInFlight` holds the promise before the loop can clear it.
  if (!drainInFlight) drainInFlight = Promise.resolve().then(runDrain)
  return drainInFlight
}
