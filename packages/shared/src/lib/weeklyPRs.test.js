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

  it('heaviest-ever 65 × 8 → one "record at 8 reps": the weight and 1RM PRs are the same set', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 65, best_1rm: 82, is_pr_weight: true, is_pr_1rm: true,
      best_per_reps: { 8: 65 }, pr_rep_counts: [8],
    })])
    expect(count).toBe(1)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].exercises).toHaveLength(1)
    expect(sessions[0].exercises[0].details).toEqual([expect.objectContaining({ type: 'repPR', repCount: 8, newValue: 65 })])
  })

  it('counts records, not exercises: two rep PRs on one exercise are two', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 70, best_1rm: 89, is_pr_weight: true, is_pr_1rm: true,
      best_per_reps: { 8: 70, 12: 60 }, pr_rep_counts: [8, 12],
    })])
    expect(count).toBe(2)
    expect(sessions[0].exercises).toHaveLength(1)
    expect(sessions[0].exercises[0].details.map(d => [d.type, d.repCount])).toEqual([['repPR', 8], ['repPR', 12]])
  })

  it('without a rep PR (legacy history, no best_per_reps) the weight and 1RM PRs stay', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 100, best_1rm: 117, is_pr_weight: true, is_pr_1rm: true,
    })])
    expect(count).toBe(2)
    expect(sessions[0].exercises[0].details.map(d => d.type)).toEqual(['bestWeight', 'best1rm'])
  })

  it('a record that is not the same set (volume) stays next to the rep PR, in order', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 65, best_1rm: 82, total_volume: 1500,
      is_pr_weight: true, is_pr_1rm: true, is_pr_volume: true,
      best_per_reps: { 8: 65 }, pr_rep_counts: [8],
    })])
    expect(count).toBe(2)
    expect(sessions[0].exercises[0].details.map(d => d.type)).toEqual(['totalVolume', 'repPR'])
  })

  it('a rep PR of another, lighter set does not hide the weight and 1RM PRs', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 70, best_1rm: 89, is_pr_weight: true, is_pr_1rm: true,
      best_per_reps: { 8: 70, 15: 40 }, pr_rep_counts: [15],
    })])
    expect(count).toBe(3)
    expect(sessions[0].exercises[0].details.map(d => d.type)).toEqual(['bestWeight', 'best1rm', 'repPR'])
  })

  it('a row converted from lb to kg (best_per_reps still in lb, #192) keeps every record', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 65, best_1rm: 82.55, is_pr_weight: true, is_pr_1rm: true,
      best_per_reps: { 8: 143.3 }, pr_rep_counts: [8],
    })])
    expect(count).toBe(3)
    expect(sessions[0].exercises[0].details.map(d => d.type)).toEqual(['bestWeight', 'best1rm', 'repPR'])
  })

  it('a row converted from kg to lb (best_per_reps still in kg, #192) keeps every record too', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 143.3, best_1rm: 181.7, is_pr_weight: true, is_pr_1rm: true,
      best_per_reps: { 8: 65 }, pr_rep_counts: [8],
    })])
    expect(count).toBe(3)
    expect(sessions[0].exercises[0].details.map(d => d.type)).toEqual(['bestWeight', 'best1rm', 'repPR'])
  })

  it('a 1RM PR without a weight PR is dropped when it is the rep PR set 1RM', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 100, best_1rm: 112, is_pr_1rm: true,
      best_per_reps: { 12: 80 }, pr_rep_counts: [12],
    })])
    expect(count).toBe(1)
    expect(sessions[0].exercises[0].details.map(d => d.type)).toEqual(['repPR'])
  })

  it('a single (1 rep): the 1RM is the weight itself, unrounded, so 102.5 × 1 is one record', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 102.5, best_1rm: 102.5, is_pr_weight: true, is_pr_1rm: true,
      best_per_reps: { 1: 102.5 }, pr_rep_counts: [1],
    })])
    expect(count).toBe(1)
    expect(sessions[0].exercises[0].details).toEqual([expect.objectContaining({ type: 'repPR', repCount: 1, newValue: 102.5 })])
  })

  it('the weight and 1RM PRs match whichever rep PR is their set, not only the first', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 70, best_1rm: 89, is_pr_weight: true, is_pr_1rm: true,
      best_per_reps: { 8: 70, 12: 60 }, pr_rep_counts: [12, 8],
    })])
    expect(count).toBe(2)
    expect(sessions[0].exercises[0].details.map(d => [d.type, d.repCount])).toEqual([['repPR', 12], ['repPR', 8]])
  })

  it('a reps PR is the same set as the rep PR at that rep count', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_weight: 60, best_reps: 12, best_1rm: 84, is_pr_reps: true,
      best_per_reps: { 12: 60 }, pr_rep_counts: [12],
    })])
    expect(count).toBe(1)
    expect(sessions[0].exercises[0].details.map(d => d.type)).toEqual(['repPR'])
  })

  it('a reps PR from a set without weight (no rep PR of its own) stays next to the rep PR', () => {
    const { count, sessions } = buildWeeklyPRs([row({
      best_reps: 15, is_pr_reps: true,
      best_per_reps: { 12: 60 }, pr_rep_counts: [12],
    })])
    expect(count).toBe(2)
    expect(sessions[0].exercises[0].details.map(d => d.type)).toEqual(['bestReps', 'repPR'])
  })

  it('records of exercises without rep PRs (weight, reps, time, distance) are kept as they are', () => {
    const { count, sessions } = buildWeeklyPRs([
      weightPR({ exercise_id: 1 }),
      row({ exercise_id: 2, best_reps: 20, is_pr_reps: true }),
      row({ exercise_id: 3, best_time_seconds: 90, is_pr_time: true }),
      row({ exercise_id: 4, best_distance_meters: 5000, is_pr_distance: true }),
    ])
    expect(count).toBe(4)
    expect(sessions[0].exercises.map(e => e.details.map(d => d.type)))
      .toEqual([['bestWeight'], ['bestReps'], ['bestTimeSeconds'], ['bestDistanceMeters']])
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
