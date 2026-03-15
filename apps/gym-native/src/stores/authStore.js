import { create } from 'zustand'
import { Platform } from 'react-native'
import { GoogleSignin, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin'
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

  loginWithGoogle: async () => {
    set({ error: null, isLoading: true })
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices()
      }
      const response = await GoogleSignin.signIn()

      if (!isSuccessResponse(response)) {
        set({ isLoading: false })
        return { success: false }
      }

      const idToken = response.data?.idToken
      if (!idToken) {
        throw new Error('No se recibió token de Google')
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })
      if (error) throw error

      set({
        session: data.session,
        user: data.user,
        isLoading: false,
      })
      return { success: true }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        set({ isLoading: false })
        return { success: false }
      }

      let errorMessage = 'Error al iniciar sesión con Google'
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services no disponible'
      }

      set({ error: errorMessage, isLoading: false })
      return { success: false, error: errorMessage }
    }
  },

  logout: async () => {
    set({ error: null })
    try {
      const isSignedIn = await GoogleSignin.isSignedIn()
      if (isSignedIn) {
        await GoogleSignin.signOut()
      }
    } catch {
      // Ignorar errores de Google Sign-Out
    }
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
