import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/constants'

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
