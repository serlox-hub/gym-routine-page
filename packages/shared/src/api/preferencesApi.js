import { getClient } from './_client.js'

export async function fetchPreferences(userId) {
  const { data, error } = await getClient()
    .from('user_preferences')
    .select('key, value')
    .eq('user_id', userId)

  if (error) throw error
  return data
}

export async function upsertPreference({ userId, key, value }) {
  const { error } = await getClient()
    .from('user_preferences')
    .upsert(
      { user_id: userId, key, value },
      { onConflict: 'user_id,key' }
    )

  if (error) throw error
  return { key, value }
}
