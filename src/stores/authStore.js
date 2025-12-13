import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import useWorkoutStore from './workoutStore'
import { queryClient } from '@/lib/queryClient'

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,
  isPasswordRecovery: false,

  initialize: async () => {
    try {
      // Detectar type=recovery en el hash antes de que Supabase lo limpie
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const isRecoveryFromHash = hashParams.get('type') === 'recovery'

      // Registrar listener ANTES de getSession para capturar eventos
      supabase.auth.onAuthStateChange((event, session) => {
        set({
          session,
          user: session?.user ?? null,
          isPasswordRecovery: event === 'PASSWORD_RECOVERY',
        })
      })

      const { data: { session } } = await supabase.auth.getSession()
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isPasswordRecovery: isRecoveryFromHash,
      })
    } catch (error) {
      set({ error: error.message, isLoading: false })
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
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Si falla (sesión expirada), limpiar storage manualmente
      const storageKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`
      localStorage.removeItem(storageKey)
    }
    set({ session: null, user: null })
    useWorkoutStore.getState().endSession()
    queryClient.clear()
    return { success: true }
  },

  clearError: () => set({ error: null }),

  clearPasswordRecovery: () => set({ isPasswordRecovery: false }),

  resetPassword: async (email) => {
    set({ error: null, isLoading: true })
    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })
      if (error) throw error
      set({ isLoading: false })
      return { success: true }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  loginWithGoogle: async () => {
    set({ error: null })
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      set({ error: error.message })
      return { success: false, error: error.message }
    }
  },

  isAuthenticated: () => !!get().session,
}))

export default useAuthStore
