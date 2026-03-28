import { getClient } from './_client.js'
import { parseDecimal } from '../lib/numberUtils.js'

export async function fetchBodyMeasurementHistory(userId, measurementType) {
  const { data, error } = await getClient()
    .from('body_measurements')
    .select('id, measurement_type, value, unit, recorded_at, notes')
    .eq('user_id', userId)
    .eq('measurement_type', measurementType)
    .order('recorded_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createBodyMeasurement({ userId, measurementType, value, unit = 'cm', notes = null, recordedAt = null }) {
  const { data, error } = await getClient()
    .from('body_measurements')
    .insert({
      user_id: userId,
      measurement_type: measurementType,
      value: parseDecimal(value),
      unit,
      notes: notes || null,
      recorded_at: recordedAt || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBodyMeasurement({ id, value, unit, notes, recordedAt }) {
  const updates = {}
  if (value !== undefined) updates.value = parseDecimal(value)
  if (unit !== undefined) updates.unit = unit
  if (notes !== undefined) updates.notes = notes || null
  if (recordedAt !== undefined) updates.recorded_at = recordedAt

  const { data, error } = await getClient()
    .from('body_measurements')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBodyMeasurement(id) {
  const { error } = await getClient()
    .from('body_measurements')
    .delete()
    .eq('id', id)

  if (error) throw error
}
