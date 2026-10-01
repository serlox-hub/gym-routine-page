import { supabase, AUTH_STORAGE_KEY } from '@/lib/supabase'
import { createAuthStore, queryClient } from '@gym/shared'
import useWorkoutStore from './workoutStore'

const useAuthStore = createAuthStore(supabase, {
  onBeforeInitialize: () => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    return { isPasswordRecovery: hashParams.get('type') === 'recovery' }
  },
  onBeforeLogout: async ({ isErrorCleanup }) => {
    if (isErrorCleanup) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    useWorkoutStore.getState().endSession()
    queryClient.clear()
  },
  onResetPasswordOptions: () => ({
    redirectTo: `${window.location.origin}/reset-password`,
  }),
})

// Web-only: Google OAuth via browser redirect
useAuthStore.setState({
  loginWithGoogle: async () => {
    useAuthStore.setState({ error: null })
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      useAuthStore.setState({ error: error.message })
      return { success: false, error: error.message }
    }
  },
})

export default useAuthStore
