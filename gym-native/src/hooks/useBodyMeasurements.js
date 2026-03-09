import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { useUserId } from './useAuth.js'

// ============================================
// QUERIES
// ============================================

export function useBodyMeasurementHistory(measurementType) {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, measurementType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('id, measurement_type, value, unit, recorded_at, notes')
        .eq('user_id', userId)
        .eq('measurement_type', measurementType)
        .order('recorded_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!userId && !!measurementType,
  })
}

export function useLatestBodyMeasurements() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.BODY_MEASUREMENTS_LATEST, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('id, measurement_type, value, unit, recorded_at')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })

      if (error) throw error

      // Agrupar por tipo y tomar el más reciente
      const latestByType = {}
      data?.forEach(record => {
        if (!latestByType[record.measurement_type]) {
          latestByType[record.measurement_type] = record
        }
      })
      return latestByType
    },
    enabled: !!userId,
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useRecordBodyMeasurement() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ measurementType, value, unit = 'cm', notes = null, recordedAt = null }) => {
      const { data, error } = await supabase
        .from('body_measurements')
        .insert({
          user_id: userId,
          measurement_type: measurementType,
          value: parseFloat(value),
          unit,
          notes: notes || null,
          recorded_at: recordedAt || new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, data.measurement_type]
      })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_MEASUREMENTS_LATEST] })
    },
  })
}

export function useUpdateBodyMeasurement() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ id, value, unit, notes, recordedAt }) => {
      const updates = {}
      if (value !== undefined) updates.value = parseFloat(value)
      if (unit !== undefined) updates.unit = unit
      if (notes !== undefined) updates.notes = notes || null
      if (recordedAt !== undefined) updates.recorded_at = recordedAt

      const { data, error } = await supabase
        .from('body_measurements')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, data.measurement_type]
      })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_MEASUREMENTS_LATEST] })
    },
  })
}

export function useDeleteBodyMeasurement() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ id, measurementType }) => {
      const { error } = await supabase
        .from('body_measurements')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { measurementType }
    },
    onSuccess: ({ measurementType }) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, measurementType]
      })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_MEASUREMENTS_LATEST] })
    },
  })
}
