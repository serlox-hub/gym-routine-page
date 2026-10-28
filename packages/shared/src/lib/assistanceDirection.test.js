import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeClientMock } from '../api/_testUtils.js'

vi.mock('../api/_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from '../api/_client.js'

import {
  bestAtRepsOrAbove,
  calculateSessionExerciseStats,
  computeExercisePRSetNumbers,
  detectNewPersonalRecords,
  findBeatenRepRecord,
  findPRSetNumbers,
  findPreviousRepRecord,
  mergeExerciseStats,
} from './sessionStatsCalculation.js'
import {
  buildStatsRowChartPoint,
  calculateExerciseStats,
  findLeastAssistanceSet,
  getBestValueFromSets,
  getLeastAssistance,
  transformSessionsToChartData,
} from './workoutCalculations.js'
import { buildPRDetailsFromStats, buildWorkoutSummaryFromEndSession, buildWorkoutSummaryFromSession } from './workoutSummary.js'
import { shouldSuggestProgression } from './progressionUtils.js'
import { fetchExerciseAllTimeStats, fetchExerciseBests } from '../api/exerciseStatsApi.js'

/**
 * Guard of issue #202: on an assisted machine LESS assistance is better and 0 (a set without
 * help) is the best value. The bug was "more is better" and "0 means no data", assumed by readers
 * that never looked at tracked_fields. One history, 40 → 30 → 20 → 0 kg at 8 reps, goes through
 * every public function that computes a best, a PR, a summary, a chart point or a progression
 * suggestion: each must rank 0 as the best and 40 as the worst.
 *
 * A new reader of bests is added here in the same change that adds it.
 */
const ASSISTED = ['assistance', 'reps']
const REPS = 8
const HISTORY = [40, 30, 20, 0]
const WORST = 40
const BEST = 0

const dbSet = (weight, setNumber = 1) => ({ weight, reps_completed: REPS, set_number: setNumber })
const allSets = HISTORY.map((weight, i) => dbSet(weight, i + 1))
const sessionStats = (weight) => calculateSessionExerciseStats([dbSet(weight)], ASSISTED)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('assistance direction guard: 0 is the best, 40 the worst', () => {
  describe('bests', () => {
    it('calculateSessionExerciseStats', () => {
      const stats = calculateSessionExerciseStats(allSets, ASSISTED)
      expect(stats.bestAssistance).toBe(BEST)
      expect(stats.bestPerReps).toEqual({ [REPS]: BEST })
    })

    it('mergeExerciseStats', () => {
      const merged = sessionStats(WORST)
      for (const weight of HISTORY.slice(1)) mergeExerciseStats(merged, sessionStats(weight), ASSISTED)
      expect(merged.bestAssistance).toBe(BEST)
      expect(merged.bestPerReps).toEqual({ [REPS]: BEST })
    })

    it('bestAtRepsOrAbove, findBeatenRepRecord, findPreviousRepRecord', () => {
      const maps = HISTORY.map(weight => ({ [REPS]: weight }))
      const options = { lowerIsBetter: true }
      expect(bestAtRepsOrAbove(REPS, false, maps, options).weight).toBe(BEST)
      expect(findPreviousRepRecord(REPS, { [REPS]: BEST }, options).weight).toBe(BEST)
      expect(findBeatenRepRecord(REPS - 1, { [REPS]: WORST }, { [REPS]: BEST }, options).weight).toBe(BEST)
    })

    it('findLeastAssistanceSet, getLeastAssistance, getBestValueFromSets', () => {
      expect(findLeastAssistanceSet(allSets, ASSISTED).weight).toBe(BEST)
      expect(getLeastAssistance(allSets, ASSISTED)).toBe(BEST)
      expect(getBestValueFromSets(allSets, ASSISTED).value).toBe(BEST)
    })

    it('calculateExerciseStats', () => {
      const sessions = HISTORY.map(weight => ({ sets: [dbSet(weight)] }))
      expect(calculateExerciseStats(sessions, ASSISTED).leastAssistance).toBe(BEST)
    })

    it('fetchExerciseBests', async () => {
      const rows = HISTORY.map(weight => ({
        exercise_id: 1, best_assistance: weight, best_per_reps: { [REPS]: weight }, exercise: { tracked_fields: ASSISTED },
      }))
      getClient.mockReturnValue(makeClientMock({ exercise_session_stats: { data: rows, error: null } }))
      const bests = await fetchExerciseBests([1])
      expect(bests[1].bestAssistance).toBe(BEST)
      expect(bests[1].bestPerReps).toEqual({ [REPS]: BEST })
    })

    it('fetchExerciseAllTimeStats', async () => {
      const rows = HISTORY.map(weight => ({ best_assistance: weight }))
      getClient.mockReturnValue(makeClientMock({ exercise_session_stats: { data: rows, error: null } }))
      expect((await fetchExerciseAllTimeStats({ exerciseId: 1 })).leastAssistance).toBe(BEST)
    })
  })

  describe('PRs', () => {
    // Each session against the bests of the ones before it, as the end of a session does.
    const judgeInOrder = (weights) => weights.slice(1).map((weight, i) => {
      const previous = weights.slice(0, i + 1)
      const bests = { bestAssistance: Math.min(...previous), bestPerReps: { [REPS]: Math.min(...previous) } }
      return detectNewPersonalRecords(sessionStats(weight), bests, ASSISTED).flags
    })

    it('detectNewPersonalRecords: every lower session is a PR, the 40 never is', () => {
      const flags = judgeInOrder(HISTORY)
      expect(flags.map(f => f.isPrAssistance)).toEqual([true, true, true])
      expect(flags.map(f => f.prRepCounts)).toEqual([[REPS], [REPS], [REPS]])
    })

    it('detectNewPersonalRecords: the same history in reverse has no PR after the 0', () => {
      const flags = judgeInOrder([...HISTORY].reverse())
      expect(flags.every(f => !f.isPrAssistance && f.prRepCounts == null)).toBe(true)
    })

    it('computeExercisePRSetNumbers (live): every lower set is a PR against a 40 before', () => {
      const sets = HISTORY.map((weight, i) => ({ setNumber: i + 1, weight, repsCompleted: REPS }))
      const bests = { bestAssistance: WORST + 10, bestPerReps: { [REPS]: WORST + 10 } }
      expect(computeExercisePRSetNumbers(sets, bests, ASSISTED)).toEqual([1, 2, 3, 4])
      const reversed = [...sets].reverse().map((set, i) => ({ ...set, setNumber: i + 1 }))
      expect(computeExercisePRSetNumbers(reversed, bests, ASSISTED)).toEqual([1])
    })

    it('findPRSetNumbers marks the 0 kg set', () => {
      expect([...findPRSetNumbers(allSets, { is_pr_assistance: true }, ASSISTED)]).toEqual([4])
    })

    it('buildPRDetailsFromStats measures a rep PR against the least previous assistance', () => {
      const [detail] = buildPRDetailsFromStats(
        { pr_rep_counts: [REPS], best_per_reps: { [REPS]: BEST } },
        { unit: 'kg', distanceUnit: 'm', trackedFields: ASSISTED, prevBests: { bestPerReps: { [REPS]: 20, [REPS + 2]: WORST } } },
      )
      expect(detail.oldValue).toBe(20)
    })
  })

  describe('summaries and charts', () => {
    const sessionExercises = [{ id: 'se-1', exercise_id: 1, exercises: { id: 1, name: 'Asistidas', tracked_fields: ASSISTED } }]

    it('buildWorkoutSummaryFromEndSession: best set 0 kg, no volume', () => {
      const completedSets = Object.fromEntries(HISTORY.map((weight, i) =>
        [`se-1-${i + 1}`, { sessionExerciseId: 'se-1', weight, repsCompleted: REPS, setNumber: i + 1 }]))
      const summary = buildWorkoutSummaryFromEndSession({ started_at: '2026-10-27T10:00:00Z' }, [], completedSets, sessionExercises)
      expect(summary.exercises[0].bestSet).toBe(`${BEST}kg × ${REPS} reps`)
      expect(summary.totalVolumeKg).toBe(0)
    })

    it('buildWorkoutSummaryFromSession: best set 0 kg, no volume', () => {
      const session = { started_at: '2026-10-27T10:00:00Z', exercises: [{ exercise: sessionExercises[0].exercises, sets: allSets }] }
      const summary = buildWorkoutSummaryFromSession(session, [])
      expect(summary.exercises[0].bestSet).toBe(`${BEST}kg × ${REPS} reps`)
      expect(summary.totalVolumeKg).toBe(0)
    })

    it('transformSessionsToChartData: the 0 kg session is the lowest point, the 40 the highest', () => {
      const sessions = HISTORY.map((weight, i) => ({ date: `2026-10-0${i + 1}`, sets: [dbSet(weight)] })).reverse()
      const points = transformSessionsToChartData(sessions, ASSISTED).map(point => point.best)
      expect(points).toEqual(HISTORY)
    })

    it('buildStatsRowChartPoint keeps the 0 kg row as 0', () => {
      const points = HISTORY.map(weight => buildStatsRowChartPoint({ session_date: '2026-10-01', best_assistance: weight }, ASSISTED, 'kg').best)
      expect(points).toEqual(HISTORY)
    })
  })

  describe('progression', () => {
    const suggest = (previous, typed) => shouldSuggestProgression({
      previousSet: { weight: previous, reps: 12 }, target: '8-12', trackedFields: ASSISTED, currentProgressable: typed,
    })

    it('typing less assistance than last time is the progress; more is not', () => {
      expect(suggest(WORST, '30')).toBe(false)
      expect(suggest(WORST, String(BEST))).toBe(false)
      expect(suggest(20, String(WORST))).toBe(true)
    })

    it('at 0 kg there is nothing left to lower', () => {
      expect(suggest(BEST, '')).toBe(false)
    })
  })
})
