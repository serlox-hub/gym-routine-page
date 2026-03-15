import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from './_stores.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchUserSettings } from '../api/adminApi.js'

export function useAuth() {
  const {
    user,
    session,
    isLoading,
    error,
    initialize,
    login,
    loginWithGoogle,
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
    loginWithGoogle,
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

export function useUserSettings() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.USER_SETTINGS, userId],
    queryFn: () => fetchUserSettings(userId),
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
