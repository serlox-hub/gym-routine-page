import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { resolveSelectedGym } from '../lib/gymUtils.js'
import {
  fetchGyms,
  createGym,
  renameGym,
  deleteGym,
  ensureDefaultGym,
  fetchGymSessionCount,
  reassignSessionGym,
} from '../api/gymsApi.js'
import { useUserId } from './useAuth.js'
import { usePreference, useUpdatePreference } from './usePreferences.js'

const LAST_GYM_KEY = 'last_gym_id'

// Guard a nivel de módulo: useSelectedGym (y por tanto useEnsureDefaultGym) se usa
// en varios componentes a la vez y comparten la misma query de gyms. Sin esto,
// todas las instancias verían gyms=[] simultáneamente y cada una intentaría crear
// el gym por defecto → violación del índice único parcial (un solo default por
// usuario). El Set compartido asegura una única creación por usuario.
const defaultGymCreationInFlight = new Set()

// ============================================
// QUERIES
// ============================================

export function useGyms() {
  const userId = useUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.GYMS, userId],
    queryFn: fetchGyms,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useGymSessionCount(gymId) {
  return useQuery({
    queryKey: [QUERY_KEYS.GYMS, 'session-count', gymId],
    queryFn: () => fetchGymSessionCount(gymId),
    enabled: !!gymId,
  })
}

// ============================================
// MUTATIONS
// ============================================

export function useCreateGym() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: ({ name }) => createGym({ userId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GYMS, userId] })
    },
  })
}

export function useRenameGym() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: ({ id, name }) => renameGym({ id, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GYMS, userId] })
    },
  })
}

export function useDeleteGym() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: (id) => deleteGym(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GYMS, userId] })
    },
  })
}

/**
 * Reasigna el gym de una sesión pasada (completada) y recalcula PRs en ambos gyms.
 */
export function useReassignSessionGym() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, newGymId }) => reassignSessionGym({ sessionId, newGymId }),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_DETAIL, 'prs', sessionId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKOUT_HISTORY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXERCISE_HISTORY] })
    },
  })
}

// ============================================
// SELECTED GYM (sticky) + ENSURE DEFAULT
// ============================================

/**
 * Garantiza que el usuario tiene al menos un gimnasio (crea el gym por defecto
 * de forma perezosa para usuarios nuevos sin histórico).
 */
export function useEnsureDefaultGym() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const { data: gyms, isLoading } = useGyms()

  useEffect(() => {
    if (!userId || isLoading || !gyms || gyms.length > 0) return
    if (defaultGymCreationInFlight.has(userId)) return
    defaultGymCreationInFlight.add(userId)
    ensureDefaultGym(userId)
      .then(() => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GYMS, userId] }))
      .catch(() => { /* posible carrera con el índice único: se resolverá al refetch */ })
      .finally(() => { defaultGymCreationInFlight.delete(userId) })
  }, [userId, gyms, isLoading, queryClient])
}

/**
 * Resuelve el gym activo (sticky): último gym usado → gym por defecto → primero.
 * Crea el gym por defecto si el usuario no tiene ninguno.
 */
export function useSelectedGym() {
  useEnsureDefaultGym()
  const { data: gyms = [], isLoading: gymsLoading } = useGyms()
  const { value: lastGymId, isLoading: prefLoading } = usePreference(LAST_GYM_KEY)

  const gym = useMemo(() => resolveSelectedGym(gyms, lastGymId), [gyms, lastGymId])

  return {
    gym,
    gymId: gym?.id ?? null,
    gyms,
    hasMultiple: gyms.length > 1,
    isLoading: gymsLoading || prefLoading,
  }
}

/**
 * Persiste el último gym usado (sticky) y expone un cambio para la sesión en curso.
 */
export function useSetSelectedGym() {
  const updatePref = useUpdatePreference()

  return {
    setSelectedGym: (gymId) =>
      updatePref.mutate({ key: LAST_GYM_KEY, value: gymId != null ? String(gymId) : null }),
    isPending: updatePref.isPending,
  }
}
