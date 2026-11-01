import { create } from 'zustand'
import { isInconclusiveSessionError, parseStoredSession } from '../lib/authSession.js'

/**
 * Factory that creates an auth Zustand store.
 *
 * @param {object} supabase - Supabase client instance
 * @param {object} [hooks] - Callback hooks for per-platform behavior
 * @param {function} [hooks.onBeforeInitialize] - Returns extra state to spread (e.g. { isPasswordRecovery })
 * @param {function} [hooks.onBeforeLogout] - Cleanup before sign-out (storage, session, cache)
 * @param {function} [hooks.onResetPasswordOptions] - Returns options for resetPasswordForEmail (e.g. { redirectTo })
 * @param {function} [hooks.readStoredSession] - Returns (or resolves to) the raw session string the auth client keeps in storage
 * @returns {object} Zustand store instance
 */
export function createAuthStore(supabase, { onBeforeInitialize, onBeforeLogout, onResetPasswordOptions, readStoredSession } = {}) {
  const loadStoredSession = async () => {
    try {
      return parseStoredSession(await readStoredSession?.())
    } catch {
      return null
    }
  }

  return create((set, get) => ({
    user: null,
    session: null,
    isLoading: true,
    error: null,
    isPasswordRecovery: false,

    initialize: async () => {
      let platformState = {}
      try {
        // Pre-initialization hook (e.g. detect recovery hash)
        platformState = onBeforeInitialize?.() ?? {}

        // Registrar listener ANTES de getSession para capturar eventos
        supabase.auth.onAuthStateChange((event, session) => {
          // The startup session is getSession's to set. INITIAL_SESSION carries the same result,
          // except that on a network error it says null while the session is still stored, and it
          // can land after getSession has resolved.
          if (event === 'INITIAL_SESSION') return
          set({
            session,
            user: session?.user ?? null,
            isPasswordRecovery: event === 'PASSWORD_RECOVERY',
          })
        })

        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        set({
          session,
          user: session?.user ?? null,
          isLoading: false,
          ...platformState,
        })
      } catch (error) {
        if (isInconclusiveSessionError(error)) {
          // No network or a stolen lock (see isInconclusiveSessionError): the stored session is still
          // there and auth-js refreshes it once the server answers (TOKEN_REFRESHED reaches the
          // listener), so the user stays in with it. Cleaning up here logged them out offline and
          // dropped the unsynced sets (#221).
          const session = await loadStoredSession()
          set({
            session,
            user: session?.user ?? null,
            isLoading: false,
            ...platformState,
          })
          return
        }
        // Any other error means the stored session is unusable (corrupt or revoked token): clean up
        // and carry on logged out
        await onBeforeLogout?.({ isErrorCleanup: true })
        set({ session: null, user: null, isLoading: false })
      }
    },

    login: async (email, password) => {
      set({ error: null, isLoading: true })
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        set({
          session: data.session,
          user: data.user,
          isLoading: false,
        })
        return { success: true }
      } catch (error) {
        set({ error: error.message, isLoading: false })
        return { success: false, error: error.message }
      }
    },

    signup: async (email, password) => {
      set({ error: null, isLoading: true })
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        set({ isLoading: false })
        return { success: true, data }
      } catch (error) {
        set({ error: error.message, isLoading: false })
        return { success: false, error: error.message }
      }
    },

    logout: async () => {
      set({ error: null })
      await onBeforeLogout?.({ isErrorCleanup: false })
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // Si falla (sesion expirada), continuamos limpiando estado
      }
      set({ session: null, user: null })
      return { success: true }
    },

    clearError: () => set({ error: null }),

    clearPasswordRecovery: () => set({ isPasswordRecovery: false }),

    resetPassword: async (email) => {
      set({ error: null, isLoading: true })
      try {
        const options = onResetPasswordOptions?.() ?? {}
        const { error } = await supabase.auth.resetPasswordForEmail(email, options)
        if (error) throw error
        set({ isLoading: false })
        return { success: true }
      } catch (error) {
        set({ error: error.message, isLoading: false })
        return { success: false, error: error.message }
      }
    },

    isAuthenticated: () => !!get().session,
  }))
}
