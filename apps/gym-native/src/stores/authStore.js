import { Platform } from 'react-native'
import { GoogleSignin, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin'
import { supabase } from '../lib/supabase'
import { createAuthStore, queryClient } from '@gym/shared'
import useWorkoutStore from './workoutStore'

const useAuthStore = createAuthStore(supabase, {
  onBeforeLogout: async () => {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn()
      if (isSignedIn) await GoogleSignin.signOut()
    } catch { /* ignore */ }
    useWorkoutStore.getState().endSession()
    queryClient.clear()
  },
})

// RN-only: Google Sign-In with native SDK
useAuthStore.setState({
  loginWithGoogle: async () => {
    useAuthStore.setState({ error: null, isLoading: true })
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices()
      }
      const response = await GoogleSignin.signIn()
      if (!isSuccessResponse(response)) {
        useAuthStore.setState({ isLoading: false })
        return { success: false }
      }
      const idToken = response.data?.idToken
      if (!idToken) {
        throw new Error('No se recibio token de Google')
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })
      if (error) throw error
      useAuthStore.setState({
        session: data.session,
        user: data.user,
        isLoading: false,
      })
      return { success: true }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        useAuthStore.setState({ isLoading: false })
        return { success: false }
      }
      let errorMessage = 'Error al iniciar sesion con Google'
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services no disponible'
      }
      useAuthStore.setState({ error: errorMessage, isLoading: false })
      return { success: false, error: errorMessage }
    }
  },
})

export default useAuthStore
