import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'

const STALE_SESSION = JSON.stringify({ access_token: 'stale', refresh_token: 'stale', expires_at: 1 })
const OTHER_KEY = 'gym-preferences'

let supabase
let AUTH_STORAGE_KEY
let useAuthStore

beforeAll(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://abcdefgh.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
  const supabaseModule = await import('@/lib/supabase')
  supabase = supabaseModule.supabase
  AUTH_STORAGE_KEY = supabaseModule.AUTH_STORAGE_KEY
  useAuthStore = (await import('./authStore.js')).default
})

afterAll(() => vi.unstubAllEnvs())

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  localStorage.setItem(AUTH_STORAGE_KEY, STALE_SESSION)
  localStorage.setItem(OTHER_KEY, 'kept')
  vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null })
})

describe('authStore', () => {
  it('drops the stored session when reading it fails, and nothing else', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: new Error('corrupt token'),
    })

    await useAuthStore.getState().initialize()

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(OTHER_KEY)).toBe('kept')
    expect(useAuthStore.getState()).toMatchObject({ session: null, user: null, isLoading: false })
  })

  it('leaves the stored session to the auth client on a normal logout', async () => {
    await useAuthStore.getState().logout()

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(STALE_SESSION)
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
