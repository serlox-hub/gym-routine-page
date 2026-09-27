import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchCompletedSessionDates } from '../api/trainingGoalsApi.js'
import { STREAK_CYCLE_LENGTH, countSessionsByCycle, calculateStreak, toggleRestCycle } from '../lib/streakUtils.js'
import { getViewedCycle } from '../lib/homeUtils.js'
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

// Referencia estable: un `[]` nuevo en cada render invalidaría el useMemo de useViewedTrainingCycle
const EMPTY = []

// ============================================
// QUERIES
// ============================================

/**
 * Hook principal para el widget de objetivos de entrenamiento.
 * Combina preferencias del usuario con datos de sesiones.
 */
export function useTrainingGoal() {
  const userId = useUserId()
  const { value: daysPerCycle, isLoading: prefsLoading } = usePreference('training_days_per_week')
  const { value: restCycles } = usePreference('training_rest_weeks')
  const { value: showWidget } = usePreference('show_training_goal')
  const { value: weekStartDay } = usePreference('week_start_day')

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS, userId],
    queryFn: () => fetchCompletedSessionDates({ userId, from: FROM_DATE }),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  // Mientras cargan las preferencias, daysPerCycle vale null aunque el usuario tenga objetivo
  const isLoading = sessionsLoading || prefsLoading
  const wsd = weekStartDay || 'monday'

  // Sin objetivo no hay racha ni progreso, pero la gráfica del widget pinta igual los días entrenados
  if (!daysPerCycle) {
    return {
      isConfigured: false,
      showWidget: showWidget !== false,
      isLoading,
      sessions: sessions || EMPTY,
      weekStartDay: wsd,
    }
  }

  const sessionsByCycle = sessions ? countSessionsByCycle(sessions, STREAK_CYCLE_LENGTH, wsd) : {}
  const streak = sessions ? calculateStreak(sessionsByCycle, daysPerCycle, restCycles || [], STREAK_CYCLE_LENGTH, new Date(), wsd) : 0

  return {
    isConfigured: true,
    showWidget: showWidget !== false,
    isLoading,
    daysPerCycle,
    streak,
    restCycles: restCycles || EMPTY,
    sessions: sessions || EMPTY,
    weekStartDay: wsd,
  }
}

/**
 * Ciclo que está mostrando el widget de racha (`cycleOffset` ciclos desde el actual)
 * y la acción de marcarlo o desmarcarlo como descanso.
 * @param {ReturnType<typeof useTrainingGoal>} goal
 * @param {number} cycleOffset
 */
export function useViewedTrainingCycle(goal, cycleOffset) {
  const updatePreference = useUpdatePreference()
  const { sessions, restCycles, daysPerCycle, weekStartDay } = goal

  const cycle = useMemo(
    () => getViewedCycle({ sessions, restCycles, daysPerCycle, weekStartDay }, cycleOffset),
    [sessions, restCycles, daysPerCycle, weekStartDay, cycleOffset]
  )

  const toggleViewedRest = () => {
    updatePreference.mutate({ key: 'training_rest_weeks', value: toggleRestCycle(restCycles, cycle.cycleKey) })
  }

  return { ...cycle, toggleViewedRest }
}
