import { getClient } from './_client.js'

export async function fetchAllUsers() {
  const { data: users, error: usersError } = await getClient()
    .rpc('get_all_users')

  if (usersError) throw usersError

  const { data: settings, error: settingsError } = await getClient()
    .from('user_settings')
    .select('user_id, key, value')

  if (settingsError) throw settingsError

  // Agrupar settings por usuario
  const settingsByUser = settings.reduce((acc, { user_id, key, value }) => {
    if (!acc[user_id]) acc[user_id] = {}
    acc[user_id][key] = value
    return acc
  }, {})

  return users.map(user => ({
    ...user,
    settings: settingsByUser[user.id] || {}
  }))
}

export async function updateUserSetting({ userId, key, value }) {
  if (value === null || value === undefined) {
    const { error } = await getClient()
      .from('user_settings')
      .delete()
      .eq('user_id', userId)
      .eq('key', key)

    if (error) throw error
  } else {
    const { error } = await getClient()
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
}
