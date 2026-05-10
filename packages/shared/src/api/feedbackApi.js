import { getClient } from './_client.js'

export async function createFeedback({ userId, type, message, appVersion, platform }) {
  const { error } = await getClient()
    .from('user_feedback')
    .insert({
      user_id: userId,
      type,
      message,
      app_version: appVersion ?? null,
      platform: platform ?? null,
    })

  if (error) throw error
}

export async function fetchAllFeedback() {
  const { data, error } = await getClient().rpc('get_all_feedback')
  if (error) throw error
  return data || []
}

export async function setFeedbackResolved({ id, resolved, adminId }) {
  const { error } = await getClient()
    .from('user_feedback')
    .update({
      resolved_at: resolved ? new Date().toISOString() : null,
      resolved_by: resolved ? adminId : null,
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteFeedback(id) {
  const { error } = await getClient()
    .from('user_feedback')
    .delete()
    .eq('id', id)

  if (error) throw error
}
