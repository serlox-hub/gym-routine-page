import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { useUserId } from './useAuth.js'

// ============================================
// QUERIES
// ============================================

export function useBodyWeightHistory() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.BODY_WEIGHT_HISTORY, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_weight_records')
        .select('id, weight, weight_unit, recorded_at, notes')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

export function useLatestBodyWeight() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.BODY_WEIGHT_LATEST, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_weight_records')
        .select('id, weight, weight_unit, recorded_at')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useRecordBodyWeight() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: async ({ weight, weightUnit = 'kg', notes = null, recordedAt = null }) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_LATEST] })
    },
  })
}

export function useUpdateBodyWeight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, weight, weightUnit, notes, recordedAt }) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_LATEST] })
    },
  })
}

export function useDeleteBodyWeight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('body_weight_records')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BODY_WEIGHT_LATEST] })
    },
  })
}
