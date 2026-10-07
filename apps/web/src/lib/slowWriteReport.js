import * as Sentry from '@sentry/react'

/**
 * Reads the session's expires_at (seconds) straight from the auth client's localStorage entry, or
 * null on any problem. Synchronous on purpose: supabase.auth.getSession() waits for the auth lock,
 * which a stuck token refresh (one of the causes issue #123 looks for) would be holding.
 */
export function readSessionExpiresAt(storageKey, storage = globalThis.localStorage) {
  try {
    const expiresAt = JSON.parse(storage.getItem(storageKey))?.expires_at
    return Number.isFinite(expiresAt) ? expiresAt : null
  } catch {
    return null
  }
}

// Sentry's server keeps about 16 KB of the timeline and silently drops whatever comes after, which
// cut the write itself out of half the first reports (the refetch burst on coming back filled it).
export const TIMELINE_BUDGET_CHARS = 15_000

// Null fields are dropped (a missing field means null): most timing fields are null cross-origin.
const serializeEntry = (entry) => JSON.stringify(entry, (_, value) => (value === null ? undefined : value))

/** Keeps the newest entries that fit the budget: the lead-in before the write is dropped before the write itself. */
export function fitTimeline(timeline, budget = TIMELINE_BUDGET_CHARS) {
  const kept = []
  let used = 0
  for (let i = timeline.length - 1; i >= 0; i--) {
    const serialized = serializeEntry(timeline[i])
    used += serialized.length
    // Stop at the first misfit: a gap mid-timeline would read as "nothing happened".
    if (used > budget) break
    kept.unshift(serialized)
  }
  return { timeline: kept, timelineDropped: timeline.length - kept.length }
}

/** Sends a watchSlowWrites payload (lib/netTimeline.js) to Sentry as a 'slow_write' warning. */
export function reportSlowWrite(payload) {
  Sentry.withScope((scope) => {
    // Unique per event, so the default Dedupe integration never drops a second report.
    scope.setFingerprint(['slow_write', String(payload.startWall)])
    // Previews also build as `production`.
    scope.setTag('host', window.location.hostname)
    // Breadcrumbs (request URLs with their query string) live on the isolation scope, out of reach
    // of this scope's clearBreadcrumbs(). A scope processor runs after they are merged in.
    scope.addEventProcessor((event) => ({ ...event, breadcrumbs: undefined }))
    Sentry.captureMessage('slow_write', {
      level: 'warning',
      // Sentry trims extra data to 3 levels (normalizeDepth), which would turn each request's
      // `timing` into "[Object]". One JSON string per entry keeps it whole.
      extra: { ...payload, ...fitTimeline(payload.timeline) },
    })
  })
}
