import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  QUERY_KEYS,
  fetchBodyMeasurementHistory,
  createBodyMeasurement,
  updateBodyMeasurement,
  deleteBodyMeasurement,
} from '@gym/shared'
import { useUserId } from './useAuth.js'

// ============================================
// QUERIES
// ============================================

export function useBodyMeasurementHistory(measurementType) {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, measurementType],
    queryFn: () => fetchBodyMeasurementHistory(userId, measurementType),
    enabled: !!userId && !!measurementType,
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useRecordBodyMeasurement() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: ({ measurementType, value, unit = 'cm', notes = null, recordedAt = null }) =>
      createBodyMeasurement({ userId, measurementType, value, unit, notes, recordedAt }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, data.measurement_type]
      })
    },
  })
}

export function useUpdateBodyMeasurement() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: ({ id, value, unit, notes, recordedAt }) =>
      updateBodyMeasurement({ id, value, unit, notes, recordedAt }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, data.measurement_type]
      })
    },
  })
}

export function useDeleteBodyMeasurement() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: ({ id, measurementType }) => deleteBodyMeasurement(id),
    onSuccess: (_, { measurementType }) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, measurementType]
      })
    },
  })
}
