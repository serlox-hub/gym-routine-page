import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'

// ============================================
// QUERIES
// ============================================

export function useAllUsers() {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_USERS],
    queryFn: async () => {
      // Obtener usuarios de auth.users (solo admins pueden ver esto)
      const { data: users, error: usersError } = await supabase
        .rpc('get_all_users')

      if (usersError) throw usersError

      // Obtener todos los settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('user_id, key, value')

      if (settingsError) throw settingsError

      // Agrupar settings por usuario
      const settingsByUser = settings.reduce((acc, { user_id, key, value }) => {
        if (!acc[user_id]) acc[user_id] = {}
        acc[user_id][key] = value
        return acc
      }, {})

      // Combinar usuarios con sus settings
      return users.map(user => ({
        ...user,
        settings: settingsByUser[user.id] || {}
      }))
    },
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useUpdateUserSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, key, value }) => {
      if (value === null || value === undefined) {
        // Eliminar setting
        const { error } = await supabase
          .from('user_settings')
          .delete()
          .eq('user_id', userId)
          .eq('key', key)

        if (error) throw error
      } else {
        // Upsert setting
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            key,
            value: String(value),
          }, {
            onConflict: 'user_id,key',
          })

        if (error) throw error
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_USERS] })
      // Si el admin se modifica a sí mismo, refrescar sus settings
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_SETTINGS, userId] })
    },
  })
}
