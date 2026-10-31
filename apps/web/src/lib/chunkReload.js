import * as Sentry from '@sentry/react'

// What each engine says when an import() fails. After a deploy the old page asks for a chunk whose
// hashed name no longer exists, but a plain network failure says the same.
const CHUNK_ERROR_MESSAGES = [
  'Failed to fetch dynamically imported module', // Chromium
  'Importing a module script failed', // WebKit
  'error loading dynamically imported module', // Firefox
]

const RELOADED_AT_KEY = 'chunk-reload-at'
const PENDING_KEY = 'chunk-reload-pending'

// 10 s was too short: on a slow gym connection one boot-and-fail cycle can outlast it and loop forever.
export const CHUNK_RELOAD_COOLDOWN_MS = 5 * 60 * 1000

/** True when the error is a failed load of a code chunk (a lazy route), not a bug in the app. */
export function isChunkLoadError(error) {
  if (!(error instanceof Error)) return false
  if (error.name === 'ChunkLoadError') return true
  return CHUNK_ERROR_MESSAGES.some((message) => error.message.includes(message))
}

/**
 * Reloads the page unless it already did in the last CHUNK_RELOAD_COOLDOWN_MS. Returns whether it
 * reloaded. Without a working sessionStorage it never reloads: it could not stop a reload loop.
 */
export function reloadOnce({ now = Date.now(), storage, reload = () => window.location.reload() } = {}) {
  try {
    // Resolved here and not as a default: reading window.sessionStorage throws when storage is blocked.
    const store = storage ?? window.sessionStorage
    const lastReloadAt = store.getItem(RELOADED_AT_KEY)
    if (lastReloadAt !== null && now - Number(lastReloadAt) < CHUNK_RELOAD_COOLDOWN_MS) return false
    store.setItem(RELOADED_AT_KEY, String(now))
    store.setItem(PENDING_KEY, '1')
    reload()
    return true
  } catch {
    return false
  }
}

/**
 * Runs on boot: if the previous page reloaded through reloadOnce, tells Sentry it came back. Sent
 * after the reload and not before it, because a message sent while the page unloads can be lost.
 */
export function reportChunkReload({ storage, capture = Sentry.captureMessage } = {}) {
  try {
    const store = storage ?? window.sessionStorage
    if (store.getItem(PENDING_KEY) === null) return
    store.removeItem(PENDING_KEY)
    capture('chunk_reload_recovered', 'info')
  } catch {
    // Boot must go on without storage: there is nothing to report then.
  }
}
