import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'

// `recalculate_exercise_prs` judges only the metrics of `pr_metrics(tracked_fields)` (issue #196).
// `db:check-pr-parity` proves pr_metrics answers like getPRMetrics; this proves each block of the
// recalculation is gated by the right metric. No browser: every case is a database answer. Each test
// gets its own exercise, so its history is only the rows it seeds, and deletes it with its sessions.
// The sessions are dated 2020 so no calendar or "recent" view of the other specs sharing this user
// ever shows them.
const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

const FLAG_COLUMNS = ['is_pr_weight', 'is_pr_reps', 'is_pr_1rm', 'is_pr_volume', 'is_pr_time', 'is_pr_distance', 'is_pr_pace']

const NO_RECORD = {
  ...Object.fromEntries(FLAG_COLUMNS.map(column => [column, false])),
  pr_rep_counts: null,
}

// Every row is seeded as a record, so a false read back is the recalculation's answer and not the
// column default.
const STALE_RECORD = {
  ...Object.fromEntries(FLAG_COLUMNS.map(column => [column, true])),
  pr_rep_counts: [99],
}

// Each case: what the exercise tracks, its sessions in order (their exercise_session_stats values),
// and the flags of the last one after recalculating from the first.
const CASES = [
  {
    name: 'weight × reps: more volume and more reps are no record',
    trackedFields: ['weight', 'reps'],
    sessions: [
      { best_weight: 100, best_reps: 5, best_1rm: 117, total_volume: 1500, best_per_reps: { 5: 100 } },
      { best_weight: 80, best_reps: 12, best_1rm: 112, total_volume: 2880, best_per_reps: { 12: 80 } },
    ],
    // pr_rep_counts left out: 12 reps above the whole history is always a rep PR.
    expected: { is_pr_weight: false, is_pr_reps: false, is_pr_1rm: false, is_pr_volume: false },
  },
  {
    name: 'level × distance × time: longer and farther is no record',
    trackedFields: ['level', 'distance', 'time'],
    sessions: [
      { best_time_seconds: 1200, best_distance_meters: 8000 },
      { best_time_seconds: 1800, best_distance_meters: 9000 },
    ],
    expected: NO_RECORD,
  },
  {
    name: 'weight × reps × time: every column better is no record',
    trackedFields: ['weight', 'reps', 'time'],
    sessions: [
      { best_weight: 20, best_reps: 10, best_1rm: 27, total_volume: 600, best_time_seconds: 30, best_per_reps: { 10: 20 } },
      { best_weight: 25, best_reps: 12, best_1rm: 35, total_volume: 900, best_time_seconds: 45, best_per_reps: { 12: 25 } },
    ],
    expected: NO_RECORD,
  },
  {
    name: 'weight × reps: heavier is a weight, 1RM and rep PR, never volume',
    trackedFields: ['weight', 'reps'],
    sessions: [
      { best_weight: 100, best_reps: 5, best_1rm: 117, total_volume: 1500, best_per_reps: { 5: 100 } },
      { best_weight: 110, best_reps: 5, best_1rm: 128, total_volume: 1650, best_per_reps: { 5: 110 } },
    ],
    expected: { ...NO_RECORD, is_pr_weight: true, is_pr_1rm: true, pr_rep_counts: [5] },
  },
  {
    name: 'weight × reps: the first weighted session after only 0 kg is a record (#189)',
    trackedFields: ['weight', 'reps'],
    sessions: [
      { best_reps: 10 },
      { best_weight: 10, best_reps: 8, best_1rm: 13, total_volume: 240, best_per_reps: { 8: 10 } },
    ],
    expected: { ...NO_RECORD, is_pr_weight: true, is_pr_1rm: true, pr_rep_counts: [8] },
  },
  {
    name: 'time only: longer is a time PR',
    trackedFields: ['time'],
    sessions: [{ best_time_seconds: 600 }, { best_time_seconds: 900 }],
    expected: { ...NO_RECORD, is_pr_time: true },
  },
  {
    name: 'reps only: more is a reps PR',
    trackedFields: ['reps'],
    sessions: [{ best_reps: 10 }, { best_reps: 15 }],
    expected: { ...NO_RECORD, is_pr_reps: true },
  },
  {
    name: 'distance only: farther is a distance PR',
    trackedFields: ['distance'],
    sessions: [{ best_distance_meters: 1000 }, { best_distance_meters: 2000 }],
    expected: { ...NO_RECORD, is_pr_distance: true },
  },
  {
    name: 'distance × pace: faster is a pace PR, farther is not a distance PR',
    trackedFields: ['distance', 'pace'],
    sessions: [
      { best_distance_meters: 5000, best_pace_seconds: 330 },
      { best_distance_meters: 6000, best_pace_seconds: 300 },
    ],
    expected: { ...NO_RECORD, is_pr_pace: true },
  },
]

async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  expect(error).toBeNull()
  return { supabase, userId: data.user.id }
}

test.describe('recalculate_exercise_prs judges what the exercise tracks', () => {
  let supabase
  let userId
  const sessionIds = []
  const exerciseIds = []

  test.beforeAll(async () => {
    ({ supabase, userId } = await signedInClient())
  })

  test.afterEach(async () => {
    if (sessionIds.length > 0) {
      const { error } = await supabase.from('workout_sessions').delete().in('id', sessionIds.splice(0))
      if (error) throw error
    }
    if (exerciseIds.length > 0) {
      const { error } = await supabase.from('exercises').delete().in('id', exerciseIds.splice(0))
      if (error) throw error
    }
  })

  /** A fresh exercise with one session per entry of `sessions`, a day apart. Returns its id. */
  async function seedHistory(name, trackedFields, sessions) {
    const { data: exercise, error: exErr } = await supabase
      .from('exercises')
      .insert({ name_es: `E2E PR ${name} ${Date.now()}`, tracked_fields: trackedFields, muscle_group_id: 1, user_id: userId })
      .select('id')
      .single()
    if (exErr) throw exErr
    exerciseIds.push(exercise.id)

    for (const [day, stats] of sessions.entries()) {
      const startedAt = new Date(Date.UTC(2020, 1, 1 + day, 10)).toISOString()
      const { data: session, error: sErr } = await supabase
        .from('workout_sessions')
        .insert({ user_id: userId, status: 'completed', started_at: startedAt, completed_at: startedAt })
        .select('id')
        .single()
      if (sErr) throw sErr
      sessionIds.push(session.id)

      const { error: statsErr } = await supabase.from('exercise_session_stats').insert({
        user_id: userId, exercise_id: exercise.id, session_id: session.id, session_date: startedAt, total_sets: 1,
        ...STALE_RECORD, ...stats,
      })
      if (statsErr) throw statsErr
    }
    return exercise.id
  }

  for (const { name, trackedFields, sessions, expected } of CASES) {
    test(name, async () => {
      const exerciseId = await seedHistory(name, trackedFields, sessions)

      const { error } = await supabase.rpc('recalculate_exercise_prs', {
        p_exercise_id: exerciseId,
        p_after_date: '2020-01-01T00:00:00Z',
        p_gym_id: null,
      })

      expect(error).toBeNull()
      const { data: rows, error: readErr } = await supabase
        .from('exercise_session_stats')
        .select(`${FLAG_COLUMNS.join(', ')}, pr_rep_counts`)
        .eq('exercise_id', exerciseId)
        .order('session_date')
      if (readErr) throw readErr
      expect(rows[0]).toEqual(NO_RECORD)
      expect(rows.at(-1)).toMatchObject(expected)
    })
  }
})
