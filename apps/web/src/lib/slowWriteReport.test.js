import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import * as Sentry from '@sentry/react'
import { readSessionExpiresAt, reportSlowWrite } from './slowWriteReport.js'

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
    expect(event.extra.timeline.map((entry) => JSON.parse(entry))).toEqual(payload.timeline)
  })
})
