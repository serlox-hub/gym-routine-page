import { supabase } from '../supabase.js'

export async function fetchBodyWeightHistory(userId) {
  const { data, error } = await supabase
    .from('body_weight_records')
    .select('id, weight, weight_unit, recorded_at, notes')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchLatestBodyWeight(userId) {
  const { data, error } = await supabase
    .from('body_weight_records')
    .select('id, weight, weight_unit, recorded_at')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createBodyWeight({ userId, weight, weightUnit = 'kg', notes = null, recordedAt = null }) {
  const { data, error } = await supabase
    .from('body_weight_records')
    .insert({
      user_id: userId,
      weight: parseFloat(weight),
      weight_unit: weightUnit,
      notes: notes || null,
      recorded_at: recordedAt || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBodyWeight({ id, weight, weightUnit, notes, recordedAt }) {
  const updates = {}
  if (weight !== undefined) updates.weight = parseFloat(weight)
  if (weightUnit !== undefined) updates.weight_unit = weightUnit
  if (notes !== undefined) updates.notes = notes || null
  if (recordedAt !== undefined) updates.recorded_at = recordedAt

  const { data, error } = await supabase
    .from('body_weight_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBodyWeight(id) {
  const { error } = await supabase
    .from('body_weight_records')
    .delete()
    .eq('id', id)

  if (error) throw error
}
