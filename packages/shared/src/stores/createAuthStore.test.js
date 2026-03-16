import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { createAuthStore } from './createAuthStore.js'

function makeSupabaseMock() {
  return {
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'tok' }, user: { id: 'u1', email: 'user@test.com' } },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'u1', email: 'user@test.com' } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({}),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  }
}

let useAuthStore
let supabaseMock

describe('createAuthStore', () => {
  beforeEach(() => {
    supabaseMock = makeSupabaseMock()
    useAuthStore = createAuthStore(supabaseMock)
  })

  // ============================================
  // INITIAL STATE
  // ============================================

  describe('Initial state', () => {
    it('has isLoading true, user null, error null', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('isAuthenticated returns false when no session', () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    })
  })

  // ============================================
  // INITIALIZE
  // ============================================

  describe('initialize()', () => {
    it('sets user from existing session', async () => {
      const mockUser = { id: 'u1', email: 'user@test.com' }
      supabaseMock.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'tok', user: mockUser } },
        error: null,
      })

      await act(async () => {
        await useAuthStore.getState().initialize()
      })

      const state = useAuthStore.getState()
      expect(state.user).toMatchObject({ id: 'u1' })
      expect(state.isLoading).toBe(false)
    })

    it('sets isLoading false when no session exists', async () => {
      await act(async () => {
        await useAuthStore.getState().initialize()
      })

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    it('registers onAuthStateChange listener', async () => {
      await act(async () => {
        await useAuthStore.getState().initialize()
      })

      expect(supabaseMock.auth.onAuthStateChange).toHaveBeenCalledOnce()
    })

    it('calls onBeforeInitialize hook if provided and spreads returned state', async () => {
      const onBeforeInitialize = vi.fn().mockReturnValue({ isPasswordRecovery: true })
      useAuthStore = createAuthStore(supabaseMock, { onBeforeInitialize })

      await act(async () => {
        await useAuthStore.getState().initialize()
      })

      expect(onBeforeInitialize).toHaveBeenCalledOnce()
      expect(useAuthStore.getState().isPasswordRecovery).toBe(true)
    })

    it('handles getSession error gracefully — sets isLoading false', async () => {
      supabaseMock.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Token corrupted'),
      })

      await act(async () => {
        await useAuthStore.getState().initialize()
      })

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    it('calls onBeforeLogout with isErrorCleanup true on getSession error', async () => {
      const onBeforeLogout = vi.fn().mockResolvedValue(undefined)
      useAuthStore = createAuthStore(supabaseMock, { onBeforeLogout })
      supabaseMock.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Token corrupted'),
      })

      await act(async () => {
        await useAuthStore.getState().initialize()
      })

      expect(onBeforeLogout).toHaveBeenCalledWith({ isErrorCleanup: true })
    })
  })

  // ============================================
  // LOGIN
  // ============================================

  describe('login()', () => {
    it('sets user and session on successful signInWithPassword', async () => {
      let result
      await act(async () => {
        result = await useAuthStore.getState().login('user@test.com', 'password123')
      })

      const state = useAuthStore.getState()
      expect(result.success).toBe(true)
      expect(state.user).toMatchObject({ id: 'u1' })
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('sets error on failed signInWithPassword', async () => {
      supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: new Error('Invalid credentials'),
      })

      let result
      await act(async () => {
        result = await useAuthStore.getState().login('user@test.com', 'wrong')
      })

      const state = useAuthStore.getState()
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
      expect(state.error).toBe('Invalid credentials')
      expect(state.isLoading).toBe(false)
    })

    it('clears previous error before attempting login', async () => {
      act(() => {
        useAuthStore.setState({ error: 'old error' })
      })

      supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: new Error('New error'),
      })

      await act(async () => {
        await useAuthStore.getState().login('user@test.com', 'wrong')
      })

      // Error is replaced with the new one, confirming it was cleared first
      expect(useAuthStore.getState().error).toBe('New error')
    })

    it('isAuthenticated returns true after successful login', async () => {
      await act(async () => {
        await useAuthStore.getState().login('user@test.com', 'password123')
      })

      expect(useAuthStore.getState().isAuthenticated()).toBe(true)
    })
  })

  // ============================================
  // SIGNUP
  // ============================================

  describe('signup()', () => {
    it('succeeds and returns data without auto-login', async () => {
      let result
      await act(async () => {
        result = await useAuthStore.getState().signup('new@test.com', 'password123')
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      // user stays null — Supabase handles confirmation flow
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('sets error on failed signUp', async () => {
      supabaseMock.auth.signUp.mockResolvedValueOnce({
        data: {},
        error: new Error('Email already registered'),
      })

      let result
      await act(async () => {
        result = await useAuthStore.getState().signup('existing@test.com', 'pass')
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already registered')
      expect(useAuthStore.getState().error).toBe('Email already registered')
    })
  })

  // ============================================
  // LOGOUT
  // ============================================

  describe('logout()', () => {
    it('clears user and session state', async () => {
      act(() => {
        useAuthStore.setState({ user: { id: 'u1' }, session: { access_token: 'tok' } })
      })

      await act(async () => {
        await useAuthStore.getState().logout()
      })

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
    })

    it('calls onBeforeLogout hook if provided', async () => {
      const onBeforeLogout = vi.fn().mockResolvedValue(undefined)
      useAuthStore = createAuthStore(supabaseMock, { onBeforeLogout })

      await act(async () => {
        await useAuthStore.getState().logout()
      })

      expect(onBeforeLogout).toHaveBeenCalledWith({ isErrorCleanup: false })
    })

    it('calls supabase.auth.signOut()', async () => {
      await act(async () => {
        await useAuthStore.getState().logout()
      })

      expect(supabaseMock.auth.signOut).toHaveBeenCalledOnce()
    })

    it('returns success even if signOut throws', async () => {
      supabaseMock.auth.signOut.mockRejectedValueOnce(new Error('Session expired'))

      let result
      await act(async () => {
        result = await useAuthStore.getState().logout()
      })

      expect(result.success).toBe(true)
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  // ============================================
  // RESET PASSWORD
  // ============================================

  describe('resetPassword()', () => {
    it('sets isLoading false and returns success', async () => {
      let result
      await act(async () => {
        result = await useAuthStore.getState().resetPassword('user@test.com')
      })

      expect(result.success).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('calls onResetPasswordOptions hook if provided', async () => {
      const onResetPasswordOptions = vi.fn().mockReturnValue({ redirectTo: 'myapp://reset' })
      useAuthStore = createAuthStore(supabaseMock, { onResetPasswordOptions })

      await act(async () => {
        await useAuthStore.getState().resetPassword('user@test.com')
      })

      expect(onResetPasswordOptions).toHaveBeenCalledOnce()
      expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'user@test.com',
        { redirectTo: 'myapp://reset' }
      )
    })

    it('sets error on failure', async () => {
      supabaseMock.auth.resetPasswordForEmail.mockResolvedValueOnce({
        error: new Error('Rate limit exceeded'),
      })

      let result
      await act(async () => {
        result = await useAuthStore.getState().resetPassword('user@test.com')
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limit exceeded')
      expect(useAuthStore.getState().error).toBe('Rate limit exceeded')
    })
  })

  // ============================================
  // CLEAR ACTIONS
  // ============================================

  describe('clearError() / clearPasswordRecovery()', () => {
    it('clearError sets error to null', () => {
      act(() => {
        useAuthStore.setState({ error: 'Some error' })
      })

      act(() => {
        useAuthStore.getState().clearError()
      })

      expect(useAuthStore.getState().error).toBeNull()
    })

    it('clearPasswordRecovery sets isPasswordRecovery to false', () => {
      act(() => {
        useAuthStore.setState({ isPasswordRecovery: true })
      })

      act(() => {
        useAuthStore.getState().clearPasswordRecovery()
      })

      expect(useAuthStore.getState().isPasswordRecovery).toBe(false)
    })
  })

  // ============================================
  // AUTH STATE CHANGE LISTENER
  // ============================================

  describe('onAuthStateChange callback', () => {
    it('updates user when auth state changes to SIGNED_IN', async () => {
      let authCallback

      supabaseMock.auth.onAuthStateChange.mockImplementation((cb) => {
        authCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      useAuthStore = createAuthStore(supabaseMock)

      await act(async () => {
        await useAuthStore.getState().initialize()
      })

      const newUser = { id: 'u2', email: 'new@test.com' }
      act(() => {
        authCallback('SIGNED_IN', { user: newUser, access_token: 'new-tok' })
      })

      expect(useAuthStore.getState().user).toMatchObject({ id: 'u2' })
    })

    it('clears user when auth state changes to SIGNED_OUT', async () => {
      let authCallback

      supabaseMock.auth.onAuthStateChange.mockImplementation((cb) => {
        authCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      useAuthStore = createAuthStore(supabaseMock)

      act(() => {
        useAuthStore.setState({ user: { id: 'u1' }, session: { access_token: 'tok' } })
      })

      await act(async () => {
        await useAuthStore.getState().initialize()
      })

      act(() => {
        authCallback('SIGNED_OUT', null)
      })

      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  // ============================================
  // FACTORY
  // ============================================

  describe('Factory', () => {
    it('creates independent store instances', () => {
      const supabaseMock2 = makeSupabaseMock()
      const store1 = createAuthStore(supabaseMock)
      const store2 = createAuthStore(supabaseMock2)

      act(() => {
        store1.setState({ user: { id: 'u1' } })
      })

      expect(store1.getState().user).toMatchObject({ id: 'u1' })
      expect(store2.getState().user).toBeNull()
    })
  })
})
