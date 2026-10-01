import { focusManager, onlineManager } from '@tanstack/react-query'
import { SLOW_PENDING_MS } from '@gym/shared'

// Diagnostics for issue #123: a short in-memory timeline of requests, visibility changes and
// writes, sent only when a write took longer than SLOW_PENDING_MS. Recording must never change a
// request, so every recording step runs through `safely` and a failure just records nothing.

/** Max finished entries kept; oldest finished dropped first. In-flight entries are never dropped. */
export const NET_TIMELINE_SIZE = 100
/**
 * Max slow_write reports per foreground period: the count restarts each time the page becomes
 * visible. Per page load, set retries in a dead zone (retry: 3, invisible to the user because they
 * are optimistic) could spend it before the hang under study, the first write after coming back.
 */
export const MAX_REPORTS = 5

// The timeline reaches back to the last time the page became visible, and at least this far
// before the write's start. auth-js starts its token refresh on that visibilitychange, which can
// be seconds before the tap, and the first attempts of a failing refresh are what tell cause 1.
const TIMELINE_LEAD_MS = 2000
// A resource entry starts within a few ms of its fetch() call. The bound keeps a request with no
// entry yet (in flight, or failed) from borrowing the entry of an earlier request to the same URL,
// such as the previous token refresh attempt, which retries 200 ms or more apart.
const RESOURCE_MATCH_TOLERANCE_MS = 100
const TIMING_TIMESTAMPS = [
  'startTime', 'workerStart', 'fetchStart', 'connectStart', 'connectEnd',
  'requestStart', 'responseStart', 'responseEnd',
]

const timeline = []
// The browser's Resource Timing buffer stops taking entries once it holds 250, which a long-lived
// page (the case under study) reaches. An observer still receives every entry.
const observedResources = []
let resourceObserver = null
let reportsSent = 0
let lastVisibleAt = null
let lastVisibleWall = null
let hiddenSinceWall = null
let lastHiddenMs = null

function safely(fn) {
  try {
    return fn()
  } catch {
    return null
  }
}

const isFinished = (entry) => entry.kind !== 'request' || entry.end !== null

function trimTimeline() {
  let finished = timeline.filter(isFinished).length
  for (let i = 0; finished > NET_TIMELINE_SIZE && i < timeline.length;) {
    if (isFinished(timeline[i])) {
      timeline.splice(i, 1)
      finished--
    } else {
      i++
    }
  }
}

function keepResources(entries) {
  for (const entry of entries) {
    if (entry.initiatorType === 'fetch') observedResources.push(entry)
  }
  if (observedResources.length > NET_TIMELINE_SIZE) {
    observedResources.splice(0, observedResources.length - NET_TIMELINE_SIZE)
  }
}

function observeResources() {
  if (resourceObserver || typeof PerformanceObserver !== 'function') return
  resourceObserver = new PerformanceObserver((list) => safely(() => keepResources(list.getEntries())))
  resourceObserver.observe({ type: 'resource', buffered: true })
}

function startRequest([input, init]) {
  const request = typeof input?.url === 'string' ? input : null
  const url = request ? request.url : String(input)
  const entry = {
    kind: 'request',
    path: new URL(url, globalThis.location?.href).pathname,
    method: String(init?.method ?? request?.method ?? 'GET').toUpperCase(),
    start: performance.now(),
    end: null,
    wall: Date.now(),
    outcome: 'pending',
    // Kept only to match Resource Timing; never serialised (it carries the query string).
    url,
  }
  timeline.push(entry)
  return entry
}

function finishRequest(entry, outcome) {
  if (!entry) return
  entry.end = performance.now()
  entry.outcome = outcome
  trimTimeline()
}

const errorOutcome = (error) => error?.name || 'Error'

/**
 * Wraps fetch. Each call resolves globalThis.fetch at call time and records
 * { kind: 'request', path, method, start, end, wall, outcome, timing } where:
 *  - path: URL pathname only, e.g. '/auth/v1/token', '/rest/v1/rpc/add_session_exercise'
 *  - start/end: performance.now(); end is when the promise settles (headers received or error)
 *  - wall: Date.now() at start
 *  - outcome: HTTP status number, or the error's name ('TypeError', 'AbortError', ...)
 *  - timing: filled when a report is built, from the Resource Timing entry matching the full URL and
 *    closest startTime: { startTime, workerStart, fetchStart, connectStart, connectEnd, requestStart,
 *    responseStart, responseEnd, duration, nextHopProtocol }, or null if none found
 * Returns the same Response / rethrows the same error. Input may be a string, URL or Request.
 */
export function createTimedFetch() {
  safely(observeResources)

  return function timedFetch(...args) {
    const entry = safely(() => startRequest(args))
    let pending
    try {
      pending = globalThis.fetch(...args)
    } catch (error) {
      safely(() => finishRequest(entry, errorOutcome(error)))
      throw error
    }
    if (!entry) return pending
    return pending.then(
      (response) => {
        safely(() => finishRequest(entry, response.status))
        return response
      },
      (error) => {
        safely(() => finishRequest(entry, errorOutcome(error)))
        throw error
      },
    )
  }
}

function recordVisibility(state) {
  const at = performance.now()
  const wall = Date.now()
  timeline.push({ kind: 'visibility', state, at, wall })
  if (state === 'hidden') {
    hiddenSinceWall = wall
  } else if (state === 'visible') {
    if (hiddenSinceWall !== null) lastHiddenMs = wall - hiddenSinceWall
    hiddenSinceWall = null
    lastVisibleAt = at
    lastVisibleWall = wall
    reportsSent = 0
  }
  trimTimeline()
}

/** Records { kind: 'visibility', state: 'hidden' | 'visible', at, wall }. Call once at startup. */
export function trackVisibility(doc = document) {
  doc.addEventListener('visibilitychange', () => safely(() => recordVisibility(doc.visibilityState)))
}

function startWrite(readSessionExpiresAt) {
  const start = performance.now()
  const startWall = Date.now()
  const expiresAt = safely(readSessionExpiresAt)
  return {
    start,
    startWall,
    from: Math.min(start - TIMELINE_LEAD_MS, lastVisibleAt ?? Infinity),
    pauses: [],
    failureCount: 0,
    settled: false,
    hiddenMs: lastHiddenMs,
    sinceVisibleMs: lastVisibleWall === null ? null : startWall - lastVisibleWall,
    sessionExpiresInMs: Number.isFinite(expiresAt) ? expiresAt * 1000 - startWall : null,
  }
}

function getResourceCandidates() {
  safely(() => keepResources(resourceObserver?.takeRecords() ?? []))
  const buffered = safely(() => performance.getEntriesByType('resource')) ?? []
  return [...buffered, ...observedResources]
}

function findResourceTiming(candidates, request) {
  let best = null
  for (const candidate of candidates) {
    if (candidate.name !== request.url) continue
    const distance = Math.abs(candidate.startTime - request.start)
    if (distance > RESOURCE_MATCH_TOLERANCE_MS) continue
    if (!best || distance < Math.abs(best.startTime - request.start)) best = candidate
  }
  return best
}

// Timestamps relative to the write's start like the rest of the timeline. A 0 means the browser
// did not expose the field (no Timing-Allow-Origin) or it does not apply (no service worker), so
// it becomes null instead of a misleading offset.
function serializeTiming(timing, origin) {
  if (!timing) return null
  const serialized = {}
  for (const field of TIMING_TIMESTAMPS) {
    serialized[field] = timing[field] ? Math.round(timing[field] - origin) : null
  }
  serialized.duration = Math.round(timing.duration)
  serialized.nextHopProtocol = timing.nextHopProtocol || null
  return serialized
}

function overlapsWindow(entry, from, to) {
  if (entry.kind === 'visibility') return entry.at >= from && entry.at <= to
  return entry.start <= to && (entry.end === null || entry.end >= from)
}

function serializeEntry(entry, write, candidates) {
  const relative = (time) => Math.round(time - write.start)
  const wall = entry.wall - write.startWall
  if (entry.kind === 'visibility') {
    return { kind: entry.kind, state: entry.state, at: relative(entry.at), wall }
  }
  return {
    kind: entry.kind,
    path: entry.path,
    method: entry.method,
    start: relative(entry.start),
    end: entry.end === null ? null : relative(entry.end),
    wall,
    outcome: entry.outcome,
    timing: serializeTiming(findResourceTiming(candidates, entry), write.start),
  }
}

function buildPayload(write, status, end) {
  const candidates = getResourceCandidates()
  return {
    status,
    durationMs: Math.round(end - write.start),
    startWall: write.startWall,
    wasPaused: write.pauses.length > 0,
    pauses: write.pauses.map(({ at, ...reason }) => ({ at: Math.round(at - write.start), ...reason })),
    failureCount: write.failureCount,
    hiddenMs: write.hiddenMs,
    sinceVisibleMs: write.sinceVisibleMs,
    sessionExpiresInMs: write.sessionExpiresInMs,
    online: globalThis.navigator?.onLine ?? null,
    timeline: timeline
      .filter((entry) => overlapsWindow(entry, write.from, end))
      .map((entry) => serializeEntry(entry, write, candidates)),
  }
}

function settleWrite(write, status, end, report) {
  write.settled = true
  if (end - write.start <= SLOW_PENDING_MS || reportsSent >= MAX_REPORTS) return
  reportsSent++
  report(buildPayload(write, status, end))
}

/**
 * Subscribes to a MutationCache. Records each mutation's first 'pending' action (at, wall), every
 * 'pause' action, and its failureCount. When it settles ('success' or 'error' action) and
 * end - start > SLOW_PENDING_MS, calls report(payload) once for it, at most MAX_REPORTS times per
 * foreground period. Returns the unsubscribe function.
 *
 * Payload: { status, durationMs, startWall, wasPaused, pauses, failureCount, hiddenMs,
 * sinceVisibleMs, sessionExpiresInMs, online, timeline }. Timeline times (start, end, at, wall and
 * the timing timestamps) are ms relative to the write's start (wall: relative to startWall).
 *
 * TanStack pauses a write in three cases, which `pauses: [{ at, online, focused }]` tells apart:
 * offline (online false), before a retry while the page is hidden (focused false), or queued behind
 * another write of the same `scope` (both true). So wasPaused alone does not mean "no network".
 */
export function watchSlowWrites(mutationCache, report, { readSessionExpiresAt }) {
  const writes = new WeakMap()

  // A throw here would surface inside TanStack's dispatch and change the mutation's outcome.
  return mutationCache.subscribe((event) => safely(() => {
    if (event.type !== 'updated') return
    const { mutation, action } = event
    if (action.type === 'pending') {
      // onMutate returning a context dispatches a second 'pending': the write started at the first.
      if (!writes.has(mutation)) writes.set(mutation, startWrite(readSessionExpiresAt))
      return
    }
    const write = writes.get(mutation)
    if (!write || write.settled) return
    if (action.type === 'pause') {
      write.pauses.push({
        at: performance.now(),
        online: onlineManager.isOnline(),
        focused: focusManager.isFocused(),
      })
    } else if (action.type === 'failed') {
      write.failureCount = action.failureCount
    } else if (action.type === 'success' || action.type === 'error') {
      // A final error never dispatches 'failed': only the state counts it.
      if (action.type === 'error') write.failureCount = mutation.state.failureCount
      settleWrite(write, action.type, performance.now(), report)
    }
  }))
}
