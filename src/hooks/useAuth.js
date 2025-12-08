import { useEffect } from 'react'
import useAuthStore from '@/stores/authStore'

export function useAuth() {
  const {
    user,
    session,
    isLoading,
    error,
    initialize,
    login,
    signup,
    logout,
    clearError,
    clearPasswordRecovery,
    resetPassword,
    isAuthenticated,
    isPasswordRecovery,
  } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return {
    user,
    session,
    isLoading,
    error,
    login,
    signup,
    logout,
    clearError,
    clearPasswordRecovery,
    resetPassword,
    isAuthenticated: isAuthenticated(),
    isPasswordRecovery,
  }
}

export function useUserId() {
  const { user } = useAuthStore()
  return user?.id ?? null
}
