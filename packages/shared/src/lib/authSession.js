/**
 * True when getSession() failed for a reason that says nothing about the stored session, so the
 * app must not treat it as a broken token and wipe it (issue #221). Two such reasons:
 * - The auth server could not be reached (no network, or a 502/503/504) while refreshing an expired
 *   token. auth-js keeps the session stored then and refreshes it on a later request.
 *   `AuthRetryableFetchError` is what auth-js's own `isAuthRetryableFetchError` checks.
 * - Another call took the auth lock while this one held it. On web auth-js guards the session with
 *   a Web Lock: a call that waits longer than `lockAcquireTimeout` (5s) steals it, and the holder
 *   fails with an `AbortError`. An offline refresh retries for about 30s, so this happens on every
 *   offline start with an expired token. `isAcquireTimeout` marks auth-js's lock timeout errors.
 * Names, not auth-js's helpers: @gym/shared gets the Supabase client injected and does not depend on it.
 */
export function isInconclusiveSessionError(error) {
  return error?.name === 'AuthRetryableFetchError' || error?.name === 'AbortError' || error?.isAcquireTimeout === true
}

/**
 * The session auth-js keeps in storage, from its raw JSON string, or null when there is none or it
 * is not a session. Checks the fields auth-js itself requires plus the user the app reads its id from.
 */
export function parseStoredSession(raw) {
  if (typeof raw !== 'string') return null
  try {
    const session = JSON.parse(raw)
    const isSession = Boolean(
      session?.access_token && session.refresh_token && session.expires_at != null && session.user?.id
    )
    return isSession ? session : null
  } catch {
    return null
  }
}
