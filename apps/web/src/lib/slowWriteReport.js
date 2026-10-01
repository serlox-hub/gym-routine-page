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
      extra: { ...payload, timeline: payload.timeline.map((entry) => JSON.stringify(entry)) },
    })
  })
}
