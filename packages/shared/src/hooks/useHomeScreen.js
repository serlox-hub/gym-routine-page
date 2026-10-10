import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchRoutineDays } from '../api/routineQueryApi.js'
import {
  fetchLastCompletedSessionForRoutine,
  fetchWeeklySessionStats,
} from '../api/workoutSessionApi.js'
import { fetchWeeklyPRs } from '../api/exerciseStatsApi.js'
import { buildWeeklyPRs } from '../lib/weeklyPRs.js'
import { getNextRoutineDay, calculateWeeklyDurationMinutes } from '../lib/homeUtils.js'
import { getCycleDateRange } from '../lib/streakUtils.js'
import { usePreference } from './usePreferences.js'
import { useAllUserExerciseGymUnits, useUserExerciseDistanceUnits } from './useExercises.js'

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
// WEEKLY PRS
// ============================================

export function useWeeklyPRs() {
  const { value: weekStartDay } = usePreference('week_start_day')
  const { value: globalWeightUnit } = usePreference('weight_unit')
  const wsd = weekStartDay || 'monday'
  const { start, end } = getCycleDateRange(7, new Date(), wsd)

  // session_date is an instant: a bare date would be read as midnight UTC and drop the last day.
  const from = start.toISOString()
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString()

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.WEEKLY_PRS, from, to],
    queryFn: () => fetchWeeklyPRs(from, to),
    staleTime: 1000 * 60 * 5,
  })
  const { data: gymUnitRows, isLoading: loadingGymUnits } = useAllUserExerciseGymUnits()
  const { data: distanceUnitOverrides, isLoading: loadingDistanceUnits } = useUserExerciseDistanceUnits()

  const { sessions, count } = useMemo(() => buildWeeklyPRs(rows, {
    gymUnitRows: gymUnitRows || [],
    globalWeightUnit,
    distanceUnitOverrides: distanceUnitOverrides || {},
  }), [rows, gymUnitRows, globalWeightUnit, distanceUnitOverrides])

  // The count does not depend on units, the details do: until they arrive a weight would read kg
  // where the exercise is in lb.
  const detailsLoading = isLoading || loadingGymUnits || loadingDistanceUnits

  return { sessions, count, isLoading, detailsLoading, isError }
}
