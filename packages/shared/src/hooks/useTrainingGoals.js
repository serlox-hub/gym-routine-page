import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchCompletedSessionDates } from '../api/trainingGoalsApi.js'
import {
  countSessionsByWeek,
  calculateStreak,
  getCurrentWeekProgress,
  isCurrentWeekRest,
  getCurrentWeekKey,
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
  const { value: daysPerWeek } = usePreference('training_days_per_week')
  const { value: restWeeks } = usePreference('training_rest_weeks')
  const { value: showWidget } = usePreference('show_training_goal')

  const { data: sessions, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS, userId],
    queryFn: () => fetchCompletedSessionDates({ userId, from: FROM_DATE }),
    enabled: !!userId && !!daysPerWeek,
    staleTime: 1000 * 60 * 5,
  })

  if (!daysPerWeek || showWidget === false) {
    return { isConfigured: false, showWidget: showWidget !== false, isLoading: false }
  }

  const sessionsByWeek = sessions ? countSessionsByWeek(sessions) : {}
  const streak = sessions ? calculateStreak(sessionsByWeek, daysPerWeek, restWeeks || []) : 0
  const weekProgress = getCurrentWeekProgress(sessionsByWeek, daysPerWeek)
  const isRestWeek = isCurrentWeekRest(restWeeks || [])
  const currentWeekKey = getCurrentWeekKey()

  return {
    isConfigured: true,
    showWidget: true,
    isLoading,
    daysPerWeek,
    streak,
    weekProgress,
    isRestWeek,
    currentWeekKey,
    restWeeks: restWeeks || [],
  }
}

// ============================================
// MUTATIONS
// ============================================

export function useUpdateTrainingGoal() {
  return useUpdatePreference()
}
