import { describe, it, expect } from 'vitest'
import { buildWeeklyPRs } from './weeklyPRs.js'

const row = (overrides = {}) => ({
  session_id: 's1',
  session_date: '2026-10-06T10:00:00Z',
  gym_id: 1,
  exercise_id: 10,
  exercise: { name: 'Sentadilla', name_en: 'Squat', distance_unit: null },
  session: { day_name: 'Pierna' },
  best_weight: null, best_reps: null, best_1rm: null, total_volume: null,
  best_time_seconds: null, best_distance_meters: null, best_per_reps: null,
  is_pr_weight: false, is_pr_reps: false, is_pr_1rm: false, is_pr_volume: false,
  is_pr_time: false, is_pr_distance: false, is_pr_pace: false,
  pr_rep_counts: null,
  ...overrides,
})

const weightPR = (overrides = {}) => row({ best_weight: 100, is_pr_weight: true, ...overrides })

describe('buildWeeklyPRs', () => {
  it('null or empty → nothing', () => {
    expect(buildWeeklyPRs(null)).toEqual({ count: 0, sessions: [] })
    expect(buildWeeklyPRs([])).toEqual({ count: 0, sessions: [] })
  })

  it('counts records, not exercises', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 100, best_1rm: 117, is_pr_weight: true, is_pr_1rm: true,
      best_per_reps: { 5: 100 }, pr_rep_counts: [5],
    })])
    expect(count).toBe(3)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].exercises).toHaveLength(1)
    expect(sessions[0].exercises[0].details.map(d => d.type)).toEqual(['bestWeight', 'best1rm', 'repPR'])
  })

  it('groups by session (newest first) and keeps each exercise once', () => {
    const { sessions } = buildWeeklyPRs([
      weightPR({ session_id: 'old', session_date: '2026-10-05T10:00:00Z' }),
      weightPR({ session_id: 'new', session_date: '2026-10-08T10:00:00Z' }),
      weightPR({ session_id: 'new', session_date: '2026-10-08T10:00:00Z', exercise_id: 11, exercise: { name: 'Press' } }),
    ])
    expect(sessions.map(s => s.sessionId)).toEqual(['new', 'old'])
    expect(sessions[0].exercises.map(e => e.exercise.name)).toEqual(['Sentadilla', 'Press'])
    expect(sessions[0]).toMatchObject({ sessionDate: '2026-10-08T10:00:00Z', dayName: 'Pierna' })
  })

  it('a row without records (empty pr_rep_counts, pace only) gives no session', () => {
    expect(buildWeeklyPRs([row({ pr_rep_counts: [] }), row({ is_pr_pace: true })])).toEqual({ count: 0, sessions: [] })
  })

  it('a session without day name (free workout) → null, translated by the component', () => {
    expect(buildWeeklyPRs([weightPR({ session: { day_name: null } })]).sessions[0].dayName).toBeNull()
    expect(buildWeeklyPRs([weightPR({ session: null })]).sessions[0].dayName).toBeNull()
  })

  it('weight unit: (exercise, gym of the session) > global > kg', () => {
    const rows = [weightPR({ session_id: 'a', gym_id: 1 }), weightPR({ session_id: 'b', gym_id: 2 })]
    const gymUnitRows = [{ exercise_id: 10, gym_id: 1, weight_unit: 'lb' }]
    const units = ({ sessions }) => Object.fromEntries(sessions.map(s => [s.sessionId, s.exercises[0].details[0].unit]))
    expect(units(buildWeeklyPRs(rows, { gymUnitRows, globalWeightUnit: 'kg' }))).toEqual({ a: 'lb', b: 'kg' })
    expect(units(buildWeeklyPRs(rows))).toEqual({ a: 'kg', b: 'kg' })
  })

  it('distance in the exercise unit, the user override first', () => {
    const rows = [row({ best_distance_meters: 5000, is_pr_distance: true, exercise: { name: 'Cinta', distance_unit: 'm' } })]
    const detail = result => result.sessions[0].exercises[0].details[0]
    expect(detail(buildWeeklyPRs(rows))).toMatchObject({ newValue: 5000, unit: 'm' })
    expect(detail(buildWeeklyPRs(rows, { distanceUnitOverrides: { 10: 'km' } }))).toMatchObject({ newValue: 5, unit: 'km' })
  })

  it('keeps the exercise row untranslated (the component picks the language)', () => {
    expect(buildWeeklyPRs([weightPR()]).sessions[0].exercises[0].exercise).toEqual({ name: 'Sentadilla', name_en: 'Squat', distance_unit: null })
  })
})
