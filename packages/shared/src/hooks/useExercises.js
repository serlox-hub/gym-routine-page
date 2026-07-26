import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { getExerciseName, getMuscleGroupName, getEquipmentName, localizeExercise, resolveWeightUnit } from '../lib/exerciseUtils.js'
import { usePreference } from './usePreferences.js'
import {
  fetchExercisesWithMuscleGroup,
  fetchMuscleGroups,
  fetchEquipmentTypes,
  fetchExerciseStats,
  fetchExerciseUsageDetail,
  fetchExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  fetchUserExerciseOverride,
  fetchUserExerciseGymUnit,
  fetchExerciseUnitsByGym,
  upsertUserExerciseOverride,
} from '../api/exerciseApi.js'
import { getNotifier } from '../notifications.js'
import { t } from '../i18n/index.js'
import { useUserId } from './useAuth.js'

export function useExercisesWithMuscleGroup() {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, 'with-muscle-group'],
    queryFn: fetchExercisesWithMuscleGroup,
    select: (data) => [...data].map(localizeExercise).sort((a, b) =>
      getExerciseName(a).localeCompare(getExerciseName(b))
    ),
  })
}

export function useMuscleGroups() {
  return useQuery({
    queryKey: [QUERY_KEYS.MUSCLE_GROUPS],
    queryFn: fetchMuscleGroups,
    select: (data) => [...data].sort((a, b) =>
      getMuscleGroupName(a).localeCompare(getMuscleGroupName(b))
    ),
  })
}

export function useEquipmentTypes() {
  return useQuery({
    queryKey: [QUERY_KEYS.EQUIPMENT_TYPES],
    queryFn: fetchEquipmentTypes,
    select: (data) => [...data].sort((a, b) =>
      getEquipmentName(a).localeCompare(getEquipmentName(b))
    ),
  })
}

export function useExerciseStats() {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_USAGE_COUNTS],
    queryFn: fetchExerciseStats,
  })
}

export function useExerciseUsageDetail(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISE_USAGE_DETAIL, exerciseId],
    queryFn: () => fetchExerciseUsageDetail(exerciseId),
    enabled: !!exerciseId,
  })
}

export function useExercise(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, exerciseId],
    queryFn: () => fetchExercise(exerciseId),
    select: localizeExercise,
    enabled: !!exerciseId,
  })
}

export function useCreateExercise() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: (params) => createExercise({ userId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
    },
  })
}

export function useUpdateExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateExercise,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES, data.id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE_ALL_EXERCISES] })
    },
  })
}

export function useDeleteExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES] })
      getNotifier()?.show(t('exercise:deleted'), 'success')
    },
  })
}

// ============================================
// USER EXERCISE OVERRIDES
// ============================================

// Unidad explícita de un (ejercicio, gym), o null si hereda la global.
export function useUserExerciseGymUnit(exerciseId, gymId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, 'gym-unit', exerciseId, gymId ?? null],
    queryFn: () => fetchUserExerciseGymUnit(exerciseId, gymId),
    enabled: !!exerciseId && gymId != null,
  })
}

// Mapa gym_id -> unidad explícita de un ejercicio (para convertir el overlay multi-gym).
export function useExerciseUnitsByGym(exerciseId, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, 'units-by-gym', exerciseId],
    queryFn: () => fetchExerciseUnitsByGym(exerciseId),
    enabled: !!exerciseId && enabled,
  })
}

// Unidad de peso efectiva para mostrar/introducir un ejercicio en un gym:
// unidad(ejercicio,gym) > preferencia global > 'kg'. DRY para web y native.
export function useResolvedWeightUnit(exerciseId, gymId) {
  const { data: gymUnit } = useUserExerciseGymUnit(exerciseId, gymId)
  const { value: globalWeightUnit } = usePreference('weight_unit')
  return resolveWeightUnit(gymUnit, { weight_unit: globalWeightUnit })
}

export function useUserExerciseOverride(exerciseId) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXERCISES, 'override', exerciseId],
    queryFn: () => fetchUserExerciseOverride(exerciseId),
    enabled: !!exerciseId,
  })
}

export function useUpsertUserExerciseOverride() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: (params) => upsertUserExerciseOverride({ userId, ...params }),
    onSuccess: (_, { exerciseId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISES, 'override', exerciseId] })
    },
  })
}
