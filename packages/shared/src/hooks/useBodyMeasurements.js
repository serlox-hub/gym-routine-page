import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  fetchBodyMeasurementHistory,
  fetchLatestBodyMeasurement,
  createBodyMeasurement,
  updateBodyMeasurement,
  deleteBodyMeasurement,
} from '../api/bodyMeasurementsApi.js'
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

export function useLatestBodyMeasurement() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.BODY_MEASUREMENT_LATEST, userId],
    queryFn: () => fetchLatestBodyMeasurement(userId),
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
    mutationFn: (params) => createBodyMeasurement({ userId, ...params }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_HISTORY, userId, data.measurement_type]
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_LATEST, userId]
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
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_LATEST, userId]
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
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BODY_MEASUREMENT_LATEST, userId]
      })
    },
  })
}
