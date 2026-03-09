import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import useWorkoutStore from './workoutStore'
import { queryClient } from '../lib/queryClient'

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,
  isPasswordRecovery: false,

  initialize: async () => {
    try {
      supabase.auth.onAuthStateChange((event, session) => {
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
      })
    } catch {
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
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Si falla, el onAuthStateChange limpiará el estado
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
      const { error } = await supabase.auth.resetPasswordForEmail(email)
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

export default useAuthStore
