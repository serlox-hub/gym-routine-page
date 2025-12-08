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

export function useUserPermissions() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.USER_PERMISSIONS, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('can_upload_video')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || { can_upload_video: false }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

export function useCanUploadVideo() {
  const { data } = useUserPermissions()
  return data?.can_upload_video ?? false
}
