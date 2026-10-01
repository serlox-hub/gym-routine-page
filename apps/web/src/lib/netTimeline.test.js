import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QueryClient, MutationObserver, focusManager, onlineManager } from '@tanstack/react-query'
import { SLOW_PENDING_MS } from '@gym/shared'

const BASE = 'https://ref.supabase.co'
const response = (status = 200) => ({ status })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The timeline and the report count are per page load (module state): each test gets a fresh copy.
let netTimeline
let clients

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  vi.resetModules()
  netTimeline = await import('./netTimeline.js')
  clients = []
})

afterEach(() => {
  clients.forEach((client) => client.unmount())
  onlineManager.setOnline(true)
  focusManager.setFocused(undefined)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function watch({ readSessionExpiresAt = () => null } = {}) {
  const client = new QueryClient()
  client.mount()
  clients.push(client)
  const report = vi.fn()
  netTimeline.watchSlowWrites(client.getMutationCache(), report, { readSessionExpiresAt })
  return { client, report }
}

function slowFn(ms, { fail = false } = {}) {
  return () => sleep(ms).then(() => {
    if (fail) throw new Error('boom')
    return 'ok'
  })
}

function mutate(client, options) {
  return new MutationObserver(client, options).mutate().catch(() => {})
}

async function runWrite(client, ms, options = {}) {
  const done = mutate(client, { mutationFn: slowFn(ms), ...options })
  await vi.advanceTimersByTimeAsync(ms)
  await done
}

function trackFakeVisibility() {
  const doc = new EventTarget()
  netTimeline.trackVisibility(doc)
  return (state) => {
    doc.visibilityState = state
    doc.dispatchEvent(new Event('visibilitychange'))
  }
}

// The timeline only leaves the module inside a report: a 5001 ms write starting now.
async function captureTimeline() {
  const { client, report } = watch()
  await runWrite(client, SLOW_PENDING_MS + 1)
  return report.mock.calls[0][0].timeline
}

describe('createTimedFetch', () => {
  it('calls whatever globalThis.fetch is at call time', async () => {
    const timedFetch = netTimeline.createTimedFetch()
    const first = vi.fn(async () => response())
    const second = vi.fn(async () => response())

    vi.stubGlobal('fetch', first)
    await timedFetch(`${BASE}/rest/v1/a`)
    vi.stubGlobal('fetch', second)
    await timedFetch(`${BASE}/rest/v1/b`)

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('passes the arguments through untouched', async () => {
    const fetch = vi.fn(async () => response())
    vi.stubGlobal('fetch', fetch)
    const init = { method: 'POST', headers: { apikey: 'key' }, body: '{}' }

    await netTimeline.createTimedFetch()(`${BASE}/rest/v1/a`, init)

    expect(fetch.mock.calls[0]).toHaveLength(2)
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/rest/v1/a`)
    expect(fetch.mock.calls[0][1]).toBe(init)
  })

  it('returns the same Response and rethrows the same error', async () => {
    const ok = response(201)
    const error = new TypeError('Load failed')
    const timedFetch = netTimeline.createTimedFetch()

    vi.stubGlobal('fetch', async () => ok)
    await expect(timedFetch(`${BASE}/rest/v1/a`)).resolves.toBe(ok)
    vi.stubGlobal('fetch', async () => { throw error })
    await expect(timedFetch(`${BASE}/rest/v1/a`)).rejects.toBe(error)
  })

  it('rethrows a synchronous throw from fetch as is', () => {
    const error = new TypeError('bad init')
    vi.stubGlobal('fetch', () => { throw error })

    expect(() => netTimeline.createTimedFetch()(`${BASE}/rest/v1/a`)).toThrow(error)
  })

  it('accepts a string, a URL and a Request, and records the path without its query', async () => {
    vi.stubGlobal('fetch', async () => response())
    const timedFetch = netTimeline.createTimedFetch()

    await timedFetch(`${BASE}/rest/v1/exercises?select=*&id=eq.7`)
    await timedFetch(new URL(`${BASE}/auth/v1/token?grant_type=refresh_token`), { method: 'post' })
    await timedFetch(new Request(`${BASE}/rest/v1/rpc/add_session_exercise?x=1`, { method: 'PATCH' }))

    const requests = (await captureTimeline()).map(({ path, method }) => ({ path, method }))
    expect(requests).toEqual([
      { path: '/rest/v1/exercises', method: 'GET' },
      { path: '/auth/v1/token', method: 'POST' },
      { path: '/rest/v1/rpc/add_session_exercise', method: 'PATCH' },
    ])
    expect(JSON.stringify(requests)).not.toContain('?')
  })

  it('records the HTTP status, the error name, or pending while in flight', async () => {
    const timedFetch = netTimeline.createTimedFetch()
    const abort = new Error('aborted')
    abort.name = 'AbortError'

    vi.stubGlobal('fetch', async () => response(409))
    await timedFetch(`${BASE}/rest/v1/a`)
    vi.stubGlobal('fetch', async () => { throw new TypeError('Load failed') })
    await timedFetch(`${BASE}/rest/v1/b`).catch(() => {})
    vi.stubGlobal('fetch', async () => { throw abort })
    await timedFetch(`${BASE}/rest/v1/c`).catch(() => {})
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    timedFetch(`${BASE}/rest/v1/d`)

    const timeline = await captureTimeline()
    expect(timeline.map(({ outcome }) => outcome)).toEqual([409, 'TypeError', 'AbortError', 'pending'])
    expect(timeline[3].end).toBeNull()
  })

  it('records a generic Error outcome and rethrows as is when fetch rejects with something that is not an Error', async () => {
    const timedFetch = netTimeline.createTimedFetch()
    // What fetch rejects with after controller.abort('timeout'): the reason itself, here a string.
    vi.stubGlobal('fetch', async () => { throw 'timeout' })

    await expect(timedFetch(`${BASE}/rest/v1/a`)).rejects.toBe('timeout')

    expect((await captureTimeline())[0].outcome).toBe('Error')
  })

  it('keeps the request working when the recorder throws', async () => {
    const ok = response()
    const error = new TypeError('Load failed')
    const timedFetch = netTimeline.createTimedFetch()
    vi.spyOn(performance, 'now').mockImplementation(() => { throw new Error('broken clock') })

    vi.stubGlobal('fetch', async () => ok)
    await expect(timedFetch(`${BASE}/rest/v1/a`)).resolves.toBe(ok)
    vi.stubGlobal('fetch', async () => { throw error })
    await expect(timedFetch(`${BASE}/rest/v1/a`)).rejects.toBe(error)
  })
})

describe('timeline buffer', () => {
  it('keeps the last NET_TIMELINE_SIZE finished entries and never drops an in-flight one', async () => {
    const timedFetch = netTimeline.createTimedFetch()
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    timedFetch(`${BASE}/rest/v1/hanging`)
    vi.stubGlobal('fetch', async () => response())
    const extra = 50
    for (let i = 0; i < netTimeline.NET_TIMELINE_SIZE + extra; i++) {
      await timedFetch(`${BASE}/rest/v1/r${i}`)
    }

    const timeline = await captureTimeline()

    expect(timeline).toHaveLength(netTimeline.NET_TIMELINE_SIZE + 1)
    expect(timeline[0]).toMatchObject({ path: '/rest/v1/hanging', end: null, outcome: 'pending' })
    expect(timeline[1].path).toBe(`/rest/v1/r${extra}`)
    expect(timeline.at(-1).path).toBe(`/rest/v1/r${netTimeline.NET_TIMELINE_SIZE + extra - 1}`)
  })

  it('reports only entries overlapping the 2 s before the write and the write itself, relative to its start', async () => {
    const timedFetch = netTimeline.createTimedFetch()
    vi.stubGlobal('fetch', async () => response())
    await timedFetch(`${BASE}/rest/v1/old`)
    await vi.advanceTimersByTimeAsync(3000)
    vi.stubGlobal('fetch', () => sleep(1000).then(() => response()))
    const recent = timedFetch(`${BASE}/rest/v1/recent`)
    await vi.advanceTimersByTimeAsync(1500)
    await recent

    const timeline = await captureTimeline()

    expect(timeline).toEqual([{
      kind: 'request',
      path: '/rest/v1/recent',
      method: 'GET',
      start: -1500,
      end: -500,
      wall: -1500,
      outcome: 200,
      timing: null,
    }])
  })

  it('fills timing from the Resource Timing entry with the same URL and closest start', async () => {
    const timedFetch = netTimeline.createTimedFetch()
    const url = `${BASE}/rest/v1/rpc/add_session_exercise?x=1`
    vi.stubGlobal('fetch', async () => response())
    await vi.advanceTimersByTimeAsync(10_000)
    const requestStart = performance.now()
    await timedFetch(url)
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    await vi.advanceTimersByTimeAsync(500)
    timedFetch(url)
    const resource = {
      name: url,
      initiatorType: 'fetch',
      startTime: requestStart + 1,
      workerStart: requestStart + 2,
      fetchStart: requestStart + 4,
      connectStart: 0,
      connectEnd: 0,
      requestStart: 0,
      responseStart: 0,
      responseEnd: requestStart + 30,
      duration: 29,
      nextHopProtocol: '',
    }
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      resource,
      { ...resource, name: `${BASE}/rest/v1/other`, startTime: requestStart },
    ])

    const [finished, inFlight] = await captureTimeline()

    expect(finished.timing).toEqual({
      startTime: -499,
      workerStart: -498,
      fetchStart: -496,
      connectStart: null,
      connectEnd: null,
      requestStart: null,
      responseStart: null,
      responseEnd: -470,
      duration: 29,
      nextHopProtocol: null,
    })
    // 500 ms after the only entry for its URL: that entry belongs to the earlier request.
    expect(inFlight.timing).toBeNull()
  })

  it('fills timing from the fetch entries the PerformanceObserver received once the browser buffer is full', async () => {
    let deliver
    const unread = []
    vi.stubGlobal('PerformanceObserver', class {
      constructor(callback) { deliver = (entries) => callback({ getEntries: () => entries }) }
      observe() {}
      takeRecords() { return unread.splice(0) }
    })
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([])
    const timedFetch = netTimeline.createTimedFetch()
    vi.stubGlobal('fetch', async () => response())
    const delivered = `${BASE}/rest/v1/delivered`
    const pending = `${BASE}/rest/v1/pending`
    await vi.advanceTimersByTimeAsync(10_000)
    const start = performance.now()
    await timedFetch(delivered)
    await timedFetch(pending)
    const entry = (name, initiatorType, offset) => ({
      name, initiatorType, startTime: start + offset, duration: 10, nextHopProtocol: 'h2',
    })
    // The <img> entry is closer, but only fetch() entries can belong to a request.
    deliver([entry(delivered, 'img', 0), entry(delivered, 'fetch', 3)])
    // Not delivered yet: only takeRecords() has it when the report is built.
    unread.push(entry(pending, 'fetch', 2))

    const [first, second] = await captureTimeline()

    expect(first.timing).toMatchObject({ startTime: 3, duration: 10, nextHopProtocol: 'h2' })
    expect(second.timing).toMatchObject({ startTime: 2 })
  })

  it('keeps only the last NET_TIMELINE_SIZE fetch entries the PerformanceObserver received', async () => {
    let deliver
    vi.stubGlobal('PerformanceObserver', class {
      constructor(callback) { deliver = (entries) => callback({ getEntries: () => entries }) }
      observe() {}
      takeRecords() { return [] }
    })
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([])
    const timedFetch = netTimeline.createTimedFetch()
    vi.stubGlobal('fetch', async () => response())
    await vi.advanceTimersByTimeAsync(10_000)
    const start = performance.now()
    const size = netTimeline.NET_TIMELINE_SIZE
    const urls = Array.from({ length: size }, (_, i) => `${BASE}/rest/v1/r${i}`)
    for (const url of urls) await timedFetch(url)
    const fetchEntry = (name) => ({ name, initiatorType: 'fetch', startTime: start + 1, duration: 10, nextHopProtocol: 'h2' })
    // One entry per request, then `evicted` more for other URLs: the oldest entries are pushed out.
    const evicted = 5
    deliver(urls.map(fetchEntry))
    deliver(Array.from({ length: evicted }, (_, i) => fetchEntry(`${BASE}/rest/v1/later${i}`)))

    const timeline = await captureTimeline()

    expect(timeline).toHaveLength(size)
    expect(timeline.map(({ timing }) => timing !== null)).toEqual([
      ...Array(evicted).fill(false),
      ...Array(size - evicted).fill(true),
    ])
  })

  it.each([
    ['is missing', undefined],
    ['throws when created', class { constructor() { throw new Error('unsupported') } }],
    ['throws when observing', class {
      observe() { throw new TypeError('unsupported entry type') }
      takeRecords() { return [] }
    }],
  ])('keeps requests and their buffered timing working when PerformanceObserver %s', async (_, observer) => {
    vi.stubGlobal('PerformanceObserver', observer)
    const ok = response()
    const url = `${BASE}/rest/v1/a`
    const timedFetch = netTimeline.createTimedFetch()
    vi.stubGlobal('fetch', async () => ok)
    await vi.advanceTimersByTimeAsync(10_000)
    const start = performance.now()
    await expect(timedFetch(url)).resolves.toBe(ok)
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      { name: url, initiatorType: 'fetch', startTime: start + 1, duration: 7, nextHopProtocol: 'h2' },
    ])

    const [entry] = await captureTimeline()

    expect(entry).toMatchObject({ outcome: 200, timing: { duration: 7 } })
  })

  it('gives each of two requests to the same URL its own Resource Timing entry', async () => {
    const timedFetch = netTimeline.createTimedFetch()
    const url = `${BASE}/rest/v1/exercises`
    vi.stubGlobal('fetch', async () => response())
    await vi.advanceTimersByTimeAsync(10_000)
    const firstStart = performance.now()
    await timedFetch(url)
    await vi.advanceTimersByTimeAsync(50)
    const secondStart = performance.now()
    await timedFetch(url)
    const resource = (startTime, duration) => ({ name: url, initiatorType: 'fetch', startTime, duration, nextHopProtocol: 'h2' })
    // Listed in the opposite order: both entries are within tolerance of both requests.
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      resource(secondStart + 1, 22),
      resource(firstStart + 1, 11),
    ])

    const [first, second] = await captureTimeline()

    expect(first.timing.duration).toBe(11)
    expect(second.timing.duration).toBe(22)
  })

  it('reports a request still in flight and one that ended inside the window, both started before it', async () => {
    const timedFetch = netTimeline.createTimedFetch()
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    timedFetch(`${BASE}/auth/v1/token`)
    vi.stubGlobal('fetch', () => sleep(9000).then(() => response()))
    const slow = timedFetch(`${BASE}/rest/v1/slow`)
    vi.stubGlobal('fetch', async () => response())
    await timedFetch(`${BASE}/rest/v1/instant`)
    await vi.advanceTimersByTimeAsync(10_000)
    await slow

    const timeline = await captureTimeline()

    expect(timeline).toMatchObject([
      { path: '/auth/v1/token', start: -10_000, end: null, outcome: 'pending' },
      { path: '/rest/v1/slow', start: -10_000, end: -1000, outcome: 200 },
    ])
  })

  it('reports the page being hidden and shown again while the write was running', async () => {
    const setVisibility = trackFakeVisibility()
    const { client, report } = watch()
    const done = mutate(client, { mutationFn: slowFn(SLOW_PENDING_MS + 1) })
    await vi.advanceTimersByTimeAsync(1000)
    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(3000)
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(1001)
    await done

    expect(report.mock.calls[0][0].timeline).toMatchObject([
      { kind: 'visibility', state: 'hidden', at: 1000, wall: 1000 },
      { kind: 'visibility', state: 'visible', at: 4000, wall: 4000 },
    ])
  })

  it('reaches back to the moment the page became visible when that was more than 2 s before the write', async () => {
    const setVisibility = trackFakeVisibility()
    const timedFetch = netTimeline.createTimedFetch()
    vi.stubGlobal('fetch', async () => response())
    await timedFetch(`${BASE}/rest/v1/before-unlock`)
    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(60_000)
    setVisibility('visible')
    await timedFetch(`${BASE}/auth/v1/token`)
    await vi.advanceTimersByTimeAsync(8000)

    const timeline = await captureTimeline()

    expect(timeline).toMatchObject([
      { kind: 'visibility', state: 'visible', at: -8000 },
      { kind: 'request', path: '/auth/v1/token', start: -8000 },
    ])
  })
})

describe('watchSlowWrites', () => {
  it('does not report a write that took 4999 ms', async () => {
    const { client, report } = watch()
    await runWrite(client, SLOW_PENDING_MS - 1)
    expect(report).not.toHaveBeenCalled()
  })

  it('reports a successful write that took 5001 ms once', async () => {
    const { client, report } = watch()
    await runWrite(client, SLOW_PENDING_MS + 1)
    await vi.advanceTimersByTimeAsync(60_000)

    expect(report).toHaveBeenCalledTimes(1)
    expect(report.mock.calls[0][0]).toMatchObject({
      status: 'success',
      durationMs: SLOW_PENDING_MS + 1,
      startWall: new Date('2026-01-01T00:00:00Z').getTime(),
      wasPaused: false,
      pauses: [],
      failureCount: 0,
      online: true,
      timeline: [],
    })
  })

  it('reports a failed write that took 5001 ms once', async () => {
    const { client, report } = watch()
    const done = mutate(client, { mutationFn: slowFn(SLOW_PENDING_MS + 1, { fail: true }) })
    await vi.advanceTimersByTimeAsync(SLOW_PENDING_MS + 1)
    await done

    expect(report).toHaveBeenCalledTimes(1)
    expect(report.mock.calls[0][0]).toMatchObject({ status: 'error', failureCount: 1 })
  })

  it('never reports the same mutation twice', async () => {
    const { client, report } = watch()
    const mutation = client.getMutationCache().build(client, { mutationFn: slowFn(SLOW_PENDING_MS + 1) })

    for (let run = 0; run < 2; run++) {
      const done = mutation.execute()
      await vi.advanceTimersByTimeAsync(SLOW_PENDING_MS + 1)
      await done
    }

    expect(report).toHaveBeenCalledTimes(1)
  })

  it('times a write whose onMutate returns a context from its first pending', async () => {
    const { client, report } = watch()
    await runWrite(client, SLOW_PENDING_MS + 1, {
      onMutate: () => sleep(3000).then(() => ({ previous: [] })),
      mutationFn: slowFn(SLOW_PENDING_MS + 1 - 3000),
    })

    expect(report).toHaveBeenCalledTimes(1)
    expect(report.mock.calls[0][0].durationMs).toBe(SLOW_PENDING_MS + 1)
  })

  it('reports wasPaused for a write that waited offline, with the reason', async () => {
    const { client, report } = watch()
    onlineManager.setOnline(false)
    const done = mutate(client, { mutationFn: slowFn(10) })
    await vi.advanceTimersByTimeAsync(10_000)
    onlineManager.setOnline(true)
    await vi.advanceTimersByTimeAsync(10)
    await done

    expect(report).toHaveBeenCalledTimes(1)
    expect(report.mock.calls[0][0]).toMatchObject({
      status: 'success',
      wasPaused: true,
      pauses: [{ at: 0, online: false, focused: true }],
    })
  })

  it('tells a write queued behind another of the same scope from one that waited offline', async () => {
    const { client, report } = watch()
    const scope = { id: 'preferences' }
    const first = mutate(client, { mutationFn: slowFn(SLOW_PENDING_MS + 1), scope })
    const queued = mutate(client, { mutationFn: slowFn(10), scope })
    await vi.advanceTimersByTimeAsync(SLOW_PENDING_MS + 11)
    await Promise.all([first, queued])

    expect(report.mock.calls.map(([payload]) => payload.pauses)).toEqual([
      [],
      [{ at: 0, online: true, focused: true }],
    ])
  })

  it('records a retry that waited for the page to come back as a pause while not focused', async () => {
    const { client, report } = watch()
    let attempts = 0
    const failsOnce = () => sleep(100).then(() => {
      attempts++
      if (attempts === 1) throw new Error('boom')
      return 'ok'
    })
    const done = mutate(client, { mutationFn: failsOnce, retry: 1, retryDelay: 1000 })
    await vi.advanceTimersByTimeAsync(500)
    focusManager.setFocused(false)
    await vi.advanceTimersByTimeAsync(5500)
    focusManager.setFocused(true)
    await vi.advanceTimersByTimeAsync(100)
    await done

    expect(report.mock.calls[0][0]).toMatchObject({
      status: 'success',
      failureCount: 1,
      pauses: [{ at: 1100, online: true, focused: false }],
    })
  })

  it('counts retries in failureCount, whether the write ends in success or error', async () => {
    const { client, report } = watch()
    let attempts = 0
    const flaky = () => sleep(100).then(() => {
      attempts++
      if (attempts < 3) throw new Error('boom')
      return sleep(SLOW_PENDING_MS)
    })
    const succeeded = mutate(client, { mutationFn: flaky, retry: 2, retryDelay: 100 })
    await vi.advanceTimersByTimeAsync(10_000)
    await succeeded

    const failed = mutate(client, { mutationFn: slowFn(1500, { fail: true }), retry: 1, retryDelay: 3000 })
    await vi.advanceTimersByTimeAsync(10_000)
    await failed

    expect(report.mock.calls.map(([payload]) => [payload.status, payload.failureCount])).toEqual([
      ['success', 2],
      ['error', 2],
    ])
  })

  it('stops after MAX_REPORTS reports', async () => {
    const { client, report } = watch()
    const writes = Array.from({ length: netTimeline.MAX_REPORTS + 2 }, () =>
      mutate(client, { mutationFn: slowFn(SLOW_PENDING_MS + 1) }),
    )
    await vi.advanceTimersByTimeAsync(SLOW_PENDING_MS + 1)
    await Promise.all(writes)

    expect(report).toHaveBeenCalledTimes(netTimeline.MAX_REPORTS)
  })

  it('starts counting MAX_REPORTS again each time the page becomes visible', async () => {
    const setVisibility = trackFakeVisibility()
    const { client, report } = watch()
    for (let i = 0; i < netTimeline.MAX_REPORTS + 1; i++) {
      await runWrite(client, SLOW_PENDING_MS + 1)
    }
    expect(report).toHaveBeenCalledTimes(netTimeline.MAX_REPORTS)

    setVisibility('hidden')
    setVisibility('visible')
    await runWrite(client, SLOW_PENDING_MS + 1)

    expect(report).toHaveBeenCalledTimes(netTimeline.MAX_REPORTS + 1)
  })

  it('reports the last hidden period and the time since visible, and the visibility events in the window', async () => {
    const setVisibility = trackFakeVisibility()
    const { client, report } = watch()

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(60_000)
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(1500)
    await runWrite(client, SLOW_PENDING_MS + 1)

    expect(report.mock.calls[0][0]).toMatchObject({
      hiddenMs: 60_000,
      sinceVisibleMs: 1500,
      timeline: [{ kind: 'visibility', state: 'visible', at: -1500, wall: -1500 }],
    })
  })

  it('reports only the latest hidden period when the page was hidden more than once', async () => {
    const setVisibility = trackFakeVisibility()
    const { client, report } = watch()

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(60_000)
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(10_000)
    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(20_000)
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(1500)
    await runWrite(client, SLOW_PENDING_MS + 1)

    expect(report.mock.calls[0][0]).toMatchObject({ hiddenMs: 20_000, sinceVisibleMs: 1500 })
  })

  it('reports hiddenMs and sinceVisibleMs as null without visibility events', async () => {
    const { client, report } = watch()
    await runWrite(client, SLOW_PENDING_MS + 1)
    expect(report.mock.calls[0][0]).toMatchObject({ hiddenMs: null, sinceVisibleMs: null })
  })

  it('reports how far from expiry the session was at the start, read when the write starts', async () => {
    const startSeconds = Date.now() / 1000
    const readSessionExpiresAt = vi.fn(() => startSeconds - 30)
    const { client, report } = watch({ readSessionExpiresAt })
    const done = mutate(client, { mutationFn: slowFn(SLOW_PENDING_MS + 1) })
    readSessionExpiresAt.mockReturnValue(startSeconds + 3600)
    await vi.advanceTimersByTimeAsync(SLOW_PENDING_MS + 1)
    await done

    expect(report.mock.calls[0][0].sessionExpiresInMs).toBe(-30_000)
  })

  it.each([
    ['returns null', () => null],
    ['throws', () => { throw new Error('storage') }],
  ])('reports sessionExpiresInMs as null when the reader %s', async (_, readSessionExpiresAt) => {
    const { client, report } = watch({ readSessionExpiresAt })
    await runWrite(client, SLOW_PENDING_MS + 1)
    expect(report.mock.calls[0][0].sessionExpiresInMs).toBeNull()
  })

  it('keeps the mutation outcome when report throws', async () => {
    const client = new QueryClient()
    clients.push(client)
    netTimeline.watchSlowWrites(client.getMutationCache(), () => { throw new Error('sentry down') }, {
      readSessionExpiresAt: () => null,
    })
    const result = new MutationObserver(client, { mutationFn: slowFn(SLOW_PENDING_MS + 1) }).mutate()
    await vi.advanceTimersByTimeAsync(SLOW_PENDING_MS + 1)

    await expect(result).resolves.toBe('ok')
  })
})
