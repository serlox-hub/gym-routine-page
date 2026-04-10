import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchRoutineDays } from '../api/routineQueryApi.js'
import {
  fetchLastCompletedSessionForRoutine,
  fetchWeeklySessionStats,
  fetchMonthlySessionCount,
} from '../api/workoutSessionApi.js'
import { getNextRoutineDay, calculateWeeklyDurationMinutes } from '../lib/homeUtils.js'
import { getCycleDateRange } from '../lib/streakUtils.js'
import { usePreference } from './usePreferences.js'

// ============================================
// NEXT ROUTINE DAY
// ============================================

export function useNextRoutineDay(routineId) {
  const { data: routineDays, isLoading: loadingDays, isError: errorDays } = useQuery({
    queryKey: [QUERY_KEYS.ROUTINE_DAYS, routineId],
    queryFn: () => fetchRoutineDays(routineId),
    enabled: !!routineId,
  })

  const { data: lastSession, isLoading: loadingLast, isError: errorLast } = useQuery({
    queryKey: [QUERY_KEYS.LAST_SESSION_FOR_ROUTINE, routineId],
    queryFn: () => fetchLastCompletedSessionForRoutine(routineId),
    enabled: !!routineId,
  })

  const nextDay = getNextRoutineDay(routineDays || [], lastSession?.routine_day_id || null)

  return {
    nextDay,
    routineDays: routineDays || [],
    isLoading: loadingDays || loadingLast,
    isError: errorDays || errorLast,
  }
}

// ============================================
// WEEKLY STATS
// ============================================

export function useWeeklyStats() {
  const { value: weekStartDay } = usePreference('week_start_day')
  const wsd = weekStartDay || 'monday'
  const { start, end } = getCycleDateRange(7, new Date(), wsd)

  const from = start.toISOString()
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString()

  const { data: sessions, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.WEEKLY_SESSION_STATS, from, to],
    queryFn: () => fetchWeeklySessionStats(from, to),
    staleTime: 1000 * 60 * 5,
  })

  const totalMinutes = calculateWeeklyDurationMinutes(sessions || [])

  return { totalMinutes, isLoading, isError }
}

// ============================================
// MONTHLY SESSION COUNT
// ============================================

export function useMonthlySessionCount() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data: count, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.MONTHLY_SESSION_COUNT, now.getFullYear(), now.getMonth()],
    queryFn: () => fetchMonthlySessionCount(from, to),
    staleTime: 1000 * 60 * 5,
  })

  return { count: count || 0, isLoading, isError }
}
