import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchCompletedSessionDates } from '../api/trainingGoalsApi.js'
import {
  countSessionsByCycle,
  calculateStreak,
  getCurrentCycleProgress,
  isCurrentCycleRest,
  getCurrentCycleKey,
  getCurrentCycleDays,
} from '../lib/streakUtils.js'
import { usePreference, useUpdatePreference } from './usePreferences.js'
import { useUserId } from './useAuth.js'

// Fecha fija de corte: 2 anos atras redondeado al inicio del ano
// Estable entre renders para no invalidar la queryFn
function getTwoYearsAgoISO() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 2, 0, 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const FROM_DATE = getTwoYearsAgoISO()

// ============================================
// QUERIES
// ============================================

/**
 * Hook principal para el widget de objetivos de entrenamiento.
 * Combina preferencias del usuario con datos de sesiones.
 */
export function useTrainingGoal() {
  const userId = useUserId()
  const { value: daysPerCycle } = usePreference('training_days_per_week')
  const { value: cycleLength } = usePreference('training_cycle_length')
  const { value: restCycles } = usePreference('training_rest_weeks')
  const { value: showWidget } = usePreference('show_training_goal')

  const { data: sessions, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS, userId],
    queryFn: () => fetchCompletedSessionDates({ userId, from: FROM_DATE }),
    enabled: !!userId && !!daysPerCycle,
    staleTime: 1000 * 60 * 5,
  })

  if (!daysPerCycle || showWidget === false) {
    return { isConfigured: false, showWidget: showWidget !== false, isLoading: false }
  }

  const len = cycleLength || 7
  const sessionsByCycle = sessions ? countSessionsByCycle(sessions, len) : {}
  const streak = sessions ? calculateStreak(sessionsByCycle, daysPerCycle, restCycles || [], len) : 0
  const cycleProgress = getCurrentCycleProgress(sessionsByCycle, daysPerCycle, len)
  const isRestCycle = isCurrentCycleRest(restCycles || [], len)
  const currentCycleKey = getCurrentCycleKey(len)
  const cycleDays = getCurrentCycleDays(sessions || [], len)

  return {
    isConfigured: true,
    showWidget: true,
    isLoading,
    daysPerCycle,
    cycleLength: len,
    streak,
    cycleProgress,
    isRestCycle,
    currentCycleKey,
    restCycles: restCycles || [],
    cycleDays,
  }
}

// ============================================
// MUTATIONS
// ============================================

export function useUpdateTrainingGoal() {
  return useUpdatePreference()
}
