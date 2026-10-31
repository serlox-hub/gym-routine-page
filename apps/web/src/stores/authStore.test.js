import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'

const STALE_SESSION = JSON.stringify({ access_token: 'stale', refresh_token: 'stale', expires_at: 1 })
const OTHER_KEY = 'gym-preferences'

let supabase
let AUTH_STORAGE_KEY
let useAuthStore
let useWorkoutStore

beforeAll(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://abcdefgh.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
  const supabaseModule = await import('@/lib/supabase')
  supabase = supabaseModule.supabase
  AUTH_STORAGE_KEY = supabaseModule.AUTH_STORAGE_KEY
  useAuthStore = (await import('./authStore.js')).default
  useWorkoutStore = (await import('./workoutStore.js')).default
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

  it('keeps the stored session and the workout when the auth server cannot be reached (issue 221)', async () => {
    const storedSession = { access_token: 'expired', refresh_token: 'refresh', expires_at: 1, user: { id: 'u1' } }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedSession))
    const workout = {
      sessionId: 7,
      completedSets: { '1-1': { weight: 80, reps: 8 } },
      pendingSets: { '1-1': { since: 1 } },
    }
    useWorkoutStore.setState(workout)
    const networkError = new Error('Failed to fetch')
    networkError.name = 'AuthRetryableFetchError'
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: networkError })

    await useAuthStore.getState().initialize()

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(JSON.stringify(storedSession))
    expect(useWorkoutStore.getState()).toMatchObject(workout)
    expect(useAuthStore.getState()).toMatchObject({ session: storedSession, user: { id: 'u1' }, isLoading: false })
  })

  it('leaves the stored session to the auth client on a normal logout', async () => {
    await useAuthStore.getState().logout()

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(STALE_SESSION)
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
