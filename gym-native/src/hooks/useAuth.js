import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import useAuthStore from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { QUERY_KEYS } from '../lib/constants'

export function useAuth() {
  const { user, session, isLoading, error, isPasswordRecovery } = useAuthStore(
    useShallow(state => ({
      user: state.user,
      session: state.session,
      isLoading: state.isLoading,
      error: state.error,
      isPasswordRecovery: state.isPasswordRecovery,
    }))
  )
  const initialize = useAuthStore(state => state.initialize)
  const login = useAuthStore(state => state.login)
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle)
  const signup = useAuthStore(state => state.signup)
  const logout = useAuthStore(state => state.logout)
  const clearError = useAuthStore(state => state.clearError)
  const resetPassword = useAuthStore(state => state.resetPassword)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const clearPasswordRecovery = useAuthStore(state => state.clearPasswordRecovery)

  useEffect(() => {
    initialize()
  }, [initialize])

  return {
    user,
    session,
    isLoading,
    error,
    login,
    loginWithGoogle,
    signup,
    logout,
    clearError,
    resetPassword,
    isAuthenticated: isAuthenticated(),
    isPasswordRecovery,
    clearPasswordRecovery,
  }
}

export function useUserId() {
  return useAuthStore(state => state.user?.id ?? null)
}

export function useUserSettings() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.USER_SETTINGS, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('key, value')
        .eq('user_id', userId)

      if (error) throw error

      // Convertir array a objeto { key: value }
      return (data || []).reduce((acc, { key, value }) => {
        acc[key] = value
        return acc
      }, {})
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

export function useCanUploadVideo() {
  const { data } = useUserSettings()
  return data?.can_upload_video === 'true'
}

export function useIsAdmin() {
  const { data, isLoading } = useUserSettings()
  return { isAdmin: data?.is_admin === 'true', isLoading }
}

export function useIsPremium() {
  const canUploadVideo = useCanUploadVideo()
  return canUploadVideo
}
