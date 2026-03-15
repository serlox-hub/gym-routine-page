import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@gym/shared'
import { useUserId } from './useAuth.js'
import {
  fetchBodyMeasurementHistory,
  createBodyMeasurement,
  updateBodyMeasurement,
  deleteBodyMeasurement,
} from '../lib/api/bodyMeasurementsApi.js'

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
    mutationFn: (params) => createBodyMeasurement({ userId, ...params }),
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
    mutationFn: updateBodyMeasurement,
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
    mutationFn: ({ id }) => deleteBodyMeasurement(id),
    onSuccess: (_, { measurementType }) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, measurementType]
      })
    },
  })
}
