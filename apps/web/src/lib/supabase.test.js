import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
// The restriction keeps app code off the data layer. This test needs the library's own default
// storage key as the reference, so it builds one client without the option on purpose.
// eslint-disable-next-line no-restricted-imports
import { createClient } from '@supabase/supabase-js'
import { readSessionExpiresAt } from './slowWriteReport.js'

const ANON_KEY = 'anon-key'
const EXPIRES_IN_SECONDS = 3600

// The auth endpoint's answer to a password sign-in: enough for the client to save a session.
function signInResponse() {
  const body = {
    access_token: 'access',
    refresh_token: 'refresh',
    token_type: 'bearer',
    expires_in: EXPIRES_IN_SECONDS,
    user: { id: 'user-1', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  }
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

const signIn = (client) => client.auth.signInWithPassword({ email: 'user@example.com', password: 'secret' })

let authClients

beforeEach(() => {
  localStorage.clear()
  authClients = []
  // Two clients on one storage key make supabase-js warn; here that is on purpose.
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', ANON_KEY)
  vi.resetModules()
})

afterEach(async () => {
  await Promise.all(authClients.map((client) => client.auth.stopAutoRefresh()))
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function importSupabase(url) {
  vi.stubEnv('VITE_SUPABASE_URL', url)
  const module = await import('./supabase.js')
  authClients.push(module.supabase)
  return module
}

describe('AUTH_STORAGE_KEY', () => {
  // Sessions saved before the key was passed explicitly live under the library's own default key.
  // If the two differ, every logged-in user is signed out on deploy.
  it.each([
    'https://abcdefgh.supabase.co',
    'http://127.0.0.1:54321',
    'http://localhost:54321',
  ])('is the key supabase-js saves a session under by default for %s', async (url) => {
    const { AUTH_STORAGE_KEY } = await importSupabase(url)
    const libraryDefaults = createClient(url, ANON_KEY, { global: { fetch: async () => signInResponse() } })
    authClients.push(libraryDefaults)

    await signIn(libraryDefaults)

    expect(Object.keys(localStorage)).toEqual([AUTH_STORAGE_KEY])
  })

  it('is where the exported client saves its session, and where the slow write diagnostics read it', async () => {
    const { supabase, AUTH_STORAGE_KEY } = await importSupabase('https://abcdefgh.supabase.co')
    vi.stubGlobal('fetch', async () => signInResponse())
    const secondsBefore = Math.floor(Date.now() / 1000)

    await signIn(supabase)

    const expiresAt = readSessionExpiresAt(AUTH_STORAGE_KEY)
    expect(expiresAt).toBeGreaterThanOrEqual(secondsBefore + EXPIRES_IN_SECONDS)
    expect(expiresAt).toBeLessThanOrEqual(secondsBefore + EXPIRES_IN_SECONDS + 5)
  })
})
