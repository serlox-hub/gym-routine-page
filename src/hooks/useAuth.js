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
    resetPassword,
    isAuthenticated,
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
    resetPassword,
    isAuthenticated: isAuthenticated(),
  }
}

export function useUserId() {
  const { user } = useAuthStore()
  return user?.id ?? null
}
