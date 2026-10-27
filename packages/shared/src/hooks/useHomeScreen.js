import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import { fetchRoutineDays } from '../api/routineQueryApi.js'
import { fetchLastCompletedSessionForRoutine } from '../api/workoutSessionApi.js'
import { fetchWeeklyPRs } from '../api/exerciseStatsApi.js'
import { buildWeeklyPRs } from '../lib/weeklyPRs.js'
import {
  getNextRoutineDay, getCycleTotalMinutes, getWeekQueryRange, selectViewedCycleOffset,
} from '../lib/homeUtils.js'
import { useHomeWeekStore } from '../stores/homeWeekStore.js'
import { usePreference } from './usePreferences.js'
import { useAllUserExerciseGymUnits, useUserExerciseDistanceUnits } from './useExercises.js'
import { useTrainingGoal } from './useTrainingGoals.js'

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
// VIEWED WEEK
// ============================================

/**
 * Week Home is showing, as an offset from the current one (negative = past). Already 0 when the
 * stored week is due for reset, so returning after the reset window never renders the old week.
 * On native, resuming from the background still shows the last frame until AppState reports
 * `active`: nothing renders before that event.
 * @returns {number}
 */
export function useHomeCycleOffset() {
  const { value: weekStartDay } = usePreference('week_start_day')
  const wsd = weekStartDay || 'monday'
  return useHomeWeekStore(state => selectViewedCycleOffset(state, Date.now(), wsd))
}

/**
 * Tells the viewed week when Home becomes visible or stops being so: enters on start and whenever
 * the platform says Home became visible, leaves when it stops being visible and on cleanup.
 * @param {{ subscribe: (onEnter: () => void, onLeave: () => void) => (() => void) }} adapter
 */
export function useHomeWeekLifecycle({ subscribe }) {
  const { value: weekStartDay } = usePreference('week_start_day')
  // Read when entering, not an effect dependency: re-subscribing when the preference loads is noise
  const weekStartDayRef = useRef(weekStartDay || 'monday')
  weekStartDayRef.current = weekStartDay || 'monday'

  useEffect(() => {
    const enter = () => useHomeWeekStore.getState().enterHome(Date.now(), weekStartDayRef.current)
    const leave = () => useHomeWeekStore.getState().leaveHome(Date.now())
    enter()
    const unsubscribe = subscribe(enter, leave)
    return () => {
      unsubscribe()
      leave()
    }
  }, [subscribe])
}

// ============================================
// WEEKLY STATS
// ============================================

/**
 * Total minutes of the viewed week. Summed from the streak card's sessions (same query, no new
 * fetch), so swiping weeks never shows a loading state and the total always equals the bars.
 * @param {number} [cycleOffset]
 */
export function useWeeklyStats(cycleOffset = 0) {
  const goal = useTrainingGoal()
  const totalMinutes = getCycleTotalMinutes(goal.sessions, cycleOffset, new Date(), goal.weekStartDay)
  return { totalMinutes, isLoading: goal.isLoading, isError: goal.sessionsError }
}

// ============================================
// WEEKLY PRS
// ============================================

/**
 * Records of the viewed week. Each week is its own query (the range is in the key); no
 * placeholderData, so a swipe shows "—" while loading instead of the previous week's number.
 * @param {number} [cycleOffset]
 */
export function useWeeklyPRs(cycleOffset = 0) {
  const { value: weekStartDay } = usePreference('week_start_day')
  const { value: globalWeightUnit } = usePreference('weight_unit')
  const { from, to } = getWeekQueryRange(cycleOffset, new Date(), weekStartDay || 'monday')

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
