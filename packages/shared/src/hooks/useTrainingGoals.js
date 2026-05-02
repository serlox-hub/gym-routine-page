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
  const { value: restCycles } = usePreference('training_rest_weeks')
  const { value: showWidget } = usePreference('show_training_goal')
  const { value: weekStartDay } = usePreference('week_start_day')

  const { data: sessions, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS, userId],
    queryFn: () => fetchCompletedSessionDates({ userId, from: FROM_DATE }),
    enabled: !!userId && !!daysPerCycle,
    staleTime: 1000 * 60 * 5,
  })

  if (!daysPerCycle) {
    return { isConfigured: false, showWidget: showWidget !== false, isLoading: false }
  }

  const CYCLE_LENGTH = 7
  const wsd = weekStartDay || 'monday'
  const sessionsByCycle = sessions ? countSessionsByCycle(sessions, CYCLE_LENGTH, wsd) : {}
  const streak = sessions ? calculateStreak(sessionsByCycle, daysPerCycle, restCycles || [], CYCLE_LENGTH, new Date(), wsd) : 0
  const cycleProgress = getCurrentCycleProgress(sessionsByCycle, daysPerCycle, CYCLE_LENGTH, new Date(), wsd)
  const isRestCycle = isCurrentCycleRest(restCycles || [], CYCLE_LENGTH, new Date(), wsd)
  const currentCycleKey = getCurrentCycleKey(CYCLE_LENGTH, new Date(), wsd)
  const cycleDays = getCurrentCycleDays(sessions || [], CYCLE_LENGTH, new Date(), wsd)

  return {
    isConfigured: true,
    showWidget: showWidget !== false,
    isLoading,
    daysPerCycle,
    streak,
    cycleProgress,
    isRestCycle,
    currentCycleKey,
    restCycles: restCycles || [],
    cycleDays,
    sessions: sessions || [],
    sessionsByCycle,
    weekStartDay: wsd,
  }
}

// ============================================
// MUTATIONS
// ============================================

export function useUpdateTrainingGoal() {
  return useUpdatePreference()
}
