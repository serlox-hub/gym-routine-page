import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchCompletedSessionDates } from '../api/trainingGoalsApi.js'
import { STREAK_CYCLE_LENGTH, countSessionsByCycle, calculateStreak, toggleRestCycle, getWeekdayInitials } from '../lib/streakUtils.js'
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
 *
 * Los errores no se tragan (issue #98): con `sessionsError` las sesiones vacías no significan "no
 * has entrenado", y con `preferencesError` el objetivo no se conoce, así que `isConfigured` vale
 * null (ni sí ni no) y la tarjeta no puede ofrecer configurarlo a quien ya lo tiene.
 */
export function useTrainingGoal() {
  const userId = useUserId()
  const {
    value: daysPerCycle, isLoading: prefsLoading, isError: preferencesError, refetch: refetchPreferences,
  } = usePreference('training_days_per_week')
  const { value: restCycles } = usePreference('training_rest_weeks')
  const { value: showWidget } = usePreference('show_training_goal')
  const { value: weekStartDay } = usePreference('week_start_day')

  const {
    data: sessions, isLoading: sessionsLoading, isError: sessionsQueryError, refetch: refetchSessions,
  } = useQuery({
    queryKey: [QUERY_KEYS.TRAINING_GOAL_SESSIONS, userId],
    queryFn: () => fetchCompletedSessionDates({ userId, from: FROM_DATE }),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  // Un refresco fallido con sesiones ya en caché no es un error para la tarjeta: los datos valen.
  const sessionsError = sessionsQueryError && !sessions
  // Mientras cargan las preferencias, daysPerCycle vale null aunque el usuario tenga objetivo
  const isLoading = sessionsLoading || prefsLoading
  const wsd = weekStartDay || 'monday'
  // `retry` relanza solo lo que falló: es lo que pulsa el «Reintentar» de la tarjeta. Mientras
  // reintenta, la query sin datos vuelve a `pending` (TanStack v5 limpia el error al empezar un
  // fetch sin datos), así que `isLoading` pasa a true y la tarjeta pinta su skeleton.
  const retry = () => {
    if (preferencesError) refetchPreferences()
    if (sessionsError) refetchSessions()
  }
  const errors = { preferencesError, sessionsError, refetchPreferences, refetchSessions, retry }

  // La ventana de la gráfica usa el inicio de semana por defecto (lunes): sin preferencias no se
  // sabe el del usuario. Aceptado: el issue #98 deja fuera los defaults del resto de preferencias.
  if (preferencesError) {
    return {
      isConfigured: null,
      showWidget: true,
      isLoading,
      sessions: sessions || EMPTY,
      weekStartDay: wsd,
      ...errors,
    }
  }

  // Sin objetivo no hay racha ni progreso, pero la gráfica del widget pinta igual los días entrenados
  if (!daysPerCycle) {
    return {
      isConfigured: false,
      showWidget: showWidget !== false,
      isLoading,
      sessions: sessions || EMPTY,
      weekStartDay: wsd,
      ...errors,
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
    ...errors,
  }
}

/**
 * Ciclo que está mostrando el widget de racha (`cycleOffset` ciclos desde el actual)
 * y la acción de marcarlo o desmarcarlo como descanso.
 * @param {ReturnType<typeof useTrainingGoal>} goal
 * @param {number} cycleOffset
 * @param {{ translate: Function, locale: string }} i18n - `t` e `i18n.language` de useTranslation()
 */
export function useViewedTrainingCycle(goal, cycleOffset, { translate, locale }) {
  const updatePreference = useUpdatePreference()
  const { sessions, restCycles, daysPerCycle, weekStartDay } = goal

  // `locale` en las deps: Home no se desmonta al cambiar de idioma, y sin él el
  // widget seguiría en el anterior hasta que cambiase otra dependencia
  const dayLabels = useMemo(() => getWeekdayInitials(translate), [translate, locale])
  const cycle = useMemo(
    () => getViewedCycle({ sessions, restCycles, daysPerCycle, weekStartDay }, cycleOffset, new Date(), { dayLabels, locale }),
    [sessions, restCycles, daysPerCycle, weekStartDay, cycleOffset, dayLabels, locale]
  )

  const toggleViewedRest = () => {
    updatePreference.mutate({ key: 'training_rest_weeks', value: toggleRestCycle(restCycles, cycle.cycleKey) })
  }

  return { ...cycle, toggleViewedRest }
}
