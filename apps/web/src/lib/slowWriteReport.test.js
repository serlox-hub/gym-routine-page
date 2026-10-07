import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import * as Sentry from '@sentry/react'
import { fitTimeline, readSessionExpiresAt, reportSlowWrite } from './slowWriteReport.js'

const KEY = 'sb-ref-auth-token'

describe('readSessionExpiresAt', () => {
  beforeEach(() => localStorage.clear())

  it('returns expires_at from the stored session', () => {
    localStorage.setItem(KEY, JSON.stringify({ access_token: 'token', expires_at: 1767225600 }))
    expect(readSessionExpiresAt(KEY)).toBe(1767225600)
  })

  it.each([
    ['there is no session', null],
    ['the entry is not JSON', '{oops'],
    ['expires_at is missing', JSON.stringify({ access_token: 'token' })],
    ['expires_at is not a number', JSON.stringify({ expires_at: '1767225600' })],
  ])('returns null when %s', (_, stored) => {
    if (stored !== null) localStorage.setItem(KEY, stored)
    expect(readSessionExpiresAt(KEY)).toBeNull()
  })

  it('returns null when the storage throws', () => {
    const storage = { getItem: () => { throw new Error('SecurityError') } }
    expect(readSessionExpiresAt(KEY, storage)).toBeNull()
  })
})

describe('reportSlowWrite', () => {
  const sent = []
  const payload = {
    status: 'success',
    durationMs: 21_000,
    startWall: 1767225600000,
    wasPaused: true,
    pauses: [{ at: 0, online: false, focused: true }],
    failureCount: 0,
    hiddenMs: 600_000,
    sinceVisibleMs: 4000,
    sessionExpiresInMs: -60_000,
    online: true,
    timeline: [{
      kind: 'request',
      path: '/auth/v1/token',
      method: 'POST',
      start: -1200,
      end: 19_500,
      wall: -1200,
      outcome: 200,
      timing: {
        startTime: -1199,
        workerStart: null,
        fetchStart: -1198,
        connectStart: null,
        connectEnd: null,
        requestStart: null,
        responseStart: null,
        responseEnd: 19_600,
        duration: 20_799,
        nextHopProtocol: 'h2',
      },
    }],
  }

  beforeAll(() => {
    Sentry.init({
      dsn: 'https://public@o0.ingest.sentry.io/0',
      defaultIntegrations: false,
      beforeSend: (event) => {
        sent.push(event)
        return null
      },
    })
  })

  afterAll(() => Sentry.close())

  beforeEach(() => { sent.length = 0 })

  async function report() {
    reportSlowWrite(payload)
    await Sentry.flush(1000)
    return sent[0]
  }

  it('sends a slow_write warning with a per-event fingerprint and the host', async () => {
    const event = await report()

    expect(event).toMatchObject({
      message: 'slow_write',
      level: 'warning',
      fingerprint: ['slow_write', '1767225600000'],
      tags: { host: window.location.hostname },
    })
  })

  it('drops the breadcrumbs recorded on the isolation scope', async () => {
    Sentry.addBreadcrumb({ category: 'fetch', data: { url: 'https://ref.supabase.co/rest/v1/sets?id=eq.7' } })

    const event = await report()

    expect(event.breadcrumbs).toBeUndefined()
  })

  it('keeps every timeline entry whole through Sentry normalisation', async () => {
    const event = await report()

    expect(event.extra).toMatchObject({ durationMs: 21_000, sessionExpiresInMs: -60_000 })
    expect(event.extra.pauses).toEqual(payload.pauses)
    expect(event.extra.timelineDropped).toBe(0)
    const [entry] = event.extra.timeline.map((serialized) => JSON.parse(serialized))
    expect(entry.timing).toEqual({
      startTime: -1199, fetchStart: -1198, responseEnd: 19_600, duration: 20_799, nextHopProtocol: 'h2',
    })
  })
})

describe('fitTimeline', () => {
  const request = (start) => ({ kind: 'request', path: '/rest/v1/sets', start, end: null, timing: null })

  it('drops null fields', () => {
    expect(fitTimeline([request(5)]).timeline).toEqual(['{"kind":"request","path":"/rest/v1/sets","start":5}'])
  })

  it('keeps the newest entries that fit and counts the dropped ones', () => {
    const size = JSON.stringify(request(10)).length - '"end":null,"timing":null,'.length

    const fitted = fitTimeline([request(10), request(20), request(30)], size * 2)

    expect(fitted.timeline.map((entry) => JSON.parse(entry).start)).toEqual([20, 30])
    expect(fitted.timelineDropped).toBe(1)
  })

  it('keeps everything when it fits', () => {
    expect(fitTimeline([request(10), request(20)]).timelineDropped).toBe(0)
  })

  it('drops everything when the newest entry alone is over the budget', () => {
    expect(fitTimeline([request(10), request(20)], 5)).toEqual({ timeline: [], timelineDropped: 2 })
  })

  it('keeps an entry that exactly fills the budget', () => {
    const exact = '{"kind":"request","path":"/rest/v1/sets","start":5}'.length

    expect(fitTimeline([request(5)], exact).timelineDropped).toBe(0)
    expect(fitTimeline([request(5)], exact - 1).timelineDropped).toBe(1)
  })

  it('stops at the first misfit instead of skipping to a smaller older entry', () => {
    const big = { kind: 'request', path: `/${'x'.repeat(200)}`, start: 1 }
    const small = (start) => ({ kind: 'request', path: '/a', start })

    const fitted = fitTimeline([small(0), big, small(2)], 100)

    expect(fitted.timeline.map((entry) => JSON.parse(entry).start)).toEqual([2])
    expect(fitted.timelineDropped).toBe(2)
  })

  it('returns an empty timeline for an empty one', () => {
    expect(fitTimeline([])).toEqual({ timeline: [], timelineDropped: 0 })
  })
})
