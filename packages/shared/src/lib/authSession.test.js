import { describe, it, expect } from 'vitest'
import { isInconclusiveSessionError, parseStoredSession } from './authSession.js'

const STORED_SESSION = {
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: 1700000000,
  user: { id: 'u1', email: 'user@test.com' },
}

function makeError(name, message) {
  const error = new Error(message)
  error.name = name
  return error
}

describe('isInconclusiveSessionError', () => {
  it('is true when the auth server cannot be reached', () => {
    expect(isInconclusiveSessionError(makeError('AuthRetryableFetchError', 'Failed to fetch'))).toBe(true)
  })

  it('is true when another call stole the auth lock (web)', () => {
    const stolen = makeError('AbortError', "Lock broken by another request with the 'steal' option.")
    expect(isInconclusiveSessionError(stolen)).toBe(true)
  })

  it('is true for an auth-js lock timeout', () => {
    const timeout = makeError('ProcessLockAcquireTimeoutError', 'Acquiring process lock timed out')
    timeout.isAcquireTimeout = true
    expect(isInconclusiveSessionError(timeout)).toBe(true)
  })

  it('is false when the server rejects the session (e.g. a revoked refresh token)', () => {
    expect(isInconclusiveSessionError(makeError('AuthApiError', 'Invalid Refresh Token'))).toBe(false)
  })

  it('is false for any other error, and for no error', () => {
    expect(isInconclusiveSessionError(new TypeError("Cannot read properties of undefined (reading 'substring')"))).toBe(false)
    expect(isInconclusiveSessionError(new Error('Token corrupted'))).toBe(false)
    expect(isInconclusiveSessionError(null)).toBe(false)
    expect(isInconclusiveSessionError(undefined)).toBe(false)
  })
})

describe('parseStoredSession', () => {
  it('returns the stored session', () => {
    expect(parseStoredSession(JSON.stringify(STORED_SESSION))).toEqual(STORED_SESSION)
  })

  it('accepts an expired session (expires_at in the past, even 0)', () => {
    const expired = { ...STORED_SESSION, expires_at: 0 }
    expect(parseStoredSession(JSON.stringify(expired))).toEqual(expired)
  })

  it('returns null when nothing is stored', () => {
    expect(parseStoredSession(null)).toBeNull()
    expect(parseStoredSession(undefined)).toBeNull()
    expect(parseStoredSession('')).toBeNull()
  })

  it('returns null for something that is not JSON', () => {
    expect(parseStoredSession('{not json')).toBeNull()
  })

  it('returns null for JSON that is not an object', () => {
    expect(parseStoredSession('null')).toBeNull()
    expect(parseStoredSession('42')).toBeNull()
    expect(parseStoredSession('"token"')).toBeNull()
  })

  it.each(['access_token', 'refresh_token', 'expires_at', 'user'])('returns null without %s', (field) => {
    const { [field]: _dropped, ...rest } = STORED_SESSION
    expect(parseStoredSession(JSON.stringify(rest))).toBeNull()
  })

  it('returns null when the user has no id', () => {
    expect(parseStoredSession(JSON.stringify({ ...STORED_SESSION, user: {} }))).toBeNull()
  })
})
