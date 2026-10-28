import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import '../scripts/loadEnv.js'
import { queryLocalDatabase } from '../scripts/localDatabase.js'

// Assisted exercises rank LESS assistance as better, and 0 is the best value (issue #202). Like
// recalculatePRRule.spec.js: no browser, every case is a database answer, each test gets its own
// exercise and deletes it with its sessions, dated 2020 so no calendar or "recent" view of the other
// specs sharing this user shows them.
//   - recalculate_exercise_prs on {assistance,reps}: the MIN window and the inverted rep-PR dominance.
//   - rebuild_assistance_stats, the code migration 074 ran on the assisted pull-up: stats rows the
//     weight model left are rebuilt from the sets and their PRs recalculated. It is internal (no API
//     role may call it), so it runs as the database owner, through the local CLI.
//   - the CHECK that keeps weight and assistance apart, and convert_user_weights on best_assistance.
const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD
const WEB_DIR = path.resolve(import.meta.dirname, '..')

const FLAG_COLUMNS = ['is_pr_weight', 'is_pr_reps', 'is_pr_1rm', 'is_pr_volume', 'is_pr_time', 'is_pr_distance', 'is_pr_pace', 'is_pr_assistance']

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

const assistancePR = (repCounts) => ({ ...NO_RECORD, is_pr_assistance: true, pr_rep_counts: repCounts })

// Each case: what the exercise tracks, its sessions in order (their exercise_session_stats values),
// and the flags of EVERY row after recalculating from the first.
const CASES = [
  {
    name: '40 → 30 → 20 kg at 8 reps: the 30 and the 20 are assistance and rep PRs, the 40 is not',
    trackedFields: ['assistance', 'reps'],
    sessions: [
      { best_assistance: 40, best_reps: 8, best_per_reps: { 8: 40 } },
      { best_assistance: 30, best_reps: 8, best_per_reps: { 8: 30 } },
      { best_assistance: 20, best_reps: 8, best_per_reps: { 8: 20 } },
    ],
    expected: [NO_RECORD, assistancePR([8]), assistancePR([8])],
  },
  {
    name: '0 kg after 20 kg: a record (0 is a value, not "missing")',
    trackedFields: ['assistance', 'reps'],
    sessions: [
      { best_assistance: 20, best_reps: 5, best_per_reps: { 5: 20 } },
      { best_assistance: 0, best_reps: 5, best_per_reps: { 5: 0 } },
    ],
    expected: [NO_RECORD, assistancePR([5])],
  },
  {
    name: 'more assistance is no record',
    trackedFields: ['assistance', 'reps'],
    sessions: [
      { best_assistance: 30, best_reps: 8, best_per_reps: { 8: 30 } },
      { best_assistance: 40, best_reps: 8, best_per_reps: { 8: 40 } },
    ],
    expected: [NO_RECORD, NO_RECORD],
  },
  {
    name: 'inverted dominance: 20 × 8 after 20 × 10 is nothing, 15 × 8 is a record',
    trackedFields: ['assistance', 'reps'],
    sessions: [
      { best_assistance: 20, best_reps: 10, best_per_reps: { 10: 20 } },
      { best_assistance: 20, best_reps: 8, best_per_reps: { 8: 20 } },
      { best_assistance: 15, best_reps: 8, best_per_reps: { 8: 15 } },
    ],
    expected: [NO_RECORD, NO_RECORD, assistancePR([8])],
  },
  {
    name: 'a 0 kg record is never beaten by another 0 kg',
    trackedFields: ['assistance', 'reps'],
    sessions: [
      { best_assistance: 0, best_reps: 8, best_per_reps: { 8: 0 } },
      { best_assistance: 0, best_reps: 8, best_per_reps: { 8: 0 } },
    ],
    expected: [NO_RECORD, NO_RECORD],
  },
  {
    name: 'the first time at a rep count is a rep PR, even with more assistance',
    trackedFields: ['assistance', 'reps'],
    sessions: [
      { best_assistance: 10, best_reps: 5, best_per_reps: { 5: 10 } },
      { best_assistance: 30, best_reps: 12, best_per_reps: { 12: 30 } },
    ],
    expected: [NO_RECORD, { ...NO_RECORD, pr_rep_counts: [12] }],
  },
  {
    name: 'assistance × time: no record',
    trackedFields: ['assistance', 'time'],
    sessions: [
      { best_assistance: 30, best_time_seconds: 20 },
      { best_assistance: 10, best_time_seconds: 40 },
    ],
    expected: [NO_RECORD, NO_RECORD],
  },
]

async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  expect(error).toBeNull()
  return { supabase, userId: data.user.id }
}

const startedAt = (day) => new Date(Date.UTC(2020, 1, 1 + day, 10)).toISOString()

test.describe('assisted exercises: less assistance is better', () => {
  let supabase
  let userId
  const sessionIds = []
  const exerciseIds = []
  const gymIds = []

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
    if (gymIds.length > 0) {
      const { error } = await supabase.from('gyms').delete().in('id', gymIds.splice(0))
      if (error) throw error
    }
  })

  async function createExercise(name, trackedFields) {
    const { data, error } = await supabase
      .from('exercises')
      .insert({ name_es: `E2E assist ${name} ${Date.now()}`, tracked_fields: trackedFields, muscle_group_id: 1, user_id: userId })
      .select('id')
      .single()
    if (error) throw error
    exerciseIds.push(data.id)
    return data.id
  }

  async function createSession(day, gymId = null) {
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({ user_id: userId, status: 'completed', started_at: startedAt(day), completed_at: startedAt(day), gym_id: gymId })
      .select('id')
      .single()
    if (error) throw error
    sessionIds.push(data.id)
    return data.id
  }

  async function insertStats(exerciseId, sessionId, day, stats, gymId = null) {
    const { error } = await supabase.from('exercise_session_stats').insert({
      user_id: userId, exercise_id: exerciseId, session_id: sessionId, session_date: startedAt(day), total_sets: 1, gym_id: gymId,
      ...STALE_RECORD, ...stats,
    })
    if (error) throw error
  }

  async function readRows(exerciseId) {
    const { data, error } = await supabase
      .from('exercise_session_stats')
      .select(`${FLAG_COLUMNS.join(', ')}, pr_rep_counts, best_assistance, best_per_reps, best_weight, best_1rm, total_volume`)
      .eq('exercise_id', exerciseId)
      .order('session_date')
    if (error) throw error
    return data
  }

  for (const { name, trackedFields, sessions, expected } of CASES) {
    test(`recalculate_exercise_prs: ${name}`, async () => {
      const exerciseId = await createExercise(name, trackedFields)
      for (const [day, stats] of sessions.entries()) {
        await insertStats(exerciseId, await createSession(day), day, stats)
      }

      const { error } = await supabase.rpc('recalculate_exercise_prs', {
        p_exercise_id: exerciseId,
        p_after_date: '2020-01-01T00:00:00Z',
        p_gym_id: null,
      })

      expect(error).toBeNull()
      const rows = await readRows(exerciseId)
      expect(rows.map(({ best_assistance: _a, best_per_reps: _b, best_weight: _w, best_1rm: _e, total_volume: _v, ...flags }) => flags))
        .toEqual(expected)
    })
  }

  test('rebuild_assistance_stats (migration 074): a weight-model history becomes an assistance one', async () => {
    const exerciseId = await createExercise('rebuild', ['assistance', 'reps'])
    // What the weight model wrote for 40 → 30 → 20 kg of help: heavier was "better".
    const history = [
      { sets: [[40, 8]], stale: { best_weight: 40, best_1rm: 51, total_volume: 320, best_per_reps: { 8: 40 } } },
      { sets: [[30, 8], [35, 6]], stale: { best_weight: 35, best_1rm: 40, total_volume: 450, best_per_reps: { 8: 30, 6: 35 } } },
      { sets: [[20, 8], [0, 0]], stale: { best_weight: 20, best_1rm: 25, total_volume: 160, best_per_reps: { 8: 20 } } },
    ]
    for (const [day, { sets, stale }] of history.entries()) {
      const sessionId = await createSession(day)
      const { data: sessionExercise, error: seErr } = await supabase
        .from('session_exercises')
        .insert({ session_id: sessionId, exercise_id: exerciseId, sort_order: 0, series: sets.length, reps: '8' })
        .select('id')
        .single()
      if (seErr) throw seErr
      const { error: setsErr } = await supabase.from('completed_sets').insert(sets.map(([weight, reps], i) => ({
        session_id: sessionId, session_exercise_id: sessionExercise.id, set_number: i + 1, weight, reps_completed: reps,
      })))
      if (setsErr) throw setsErr
      await insertStats(exerciseId, sessionId, day, stale)
    }

    queryLocalDatabase(WEB_DIR, `SELECT rebuild_assistance_stats(${Number(exerciseId)})`)

    const rows = await readRows(exerciseId)
    expect(rows.map(row => Number(row.best_assistance))).toEqual([40, 30, 20])
    expect(rows.map(row => row.best_per_reps)).toEqual([{ 8: 40 }, { 6: 35, 8: 30 }, { 8: 20 }])
    for (const row of rows) {
      expect(row).toMatchObject({ best_weight: null, best_1rm: null, total_volume: null, is_pr_weight: false, is_pr_1rm: false, is_pr_volume: false })
    }
    expect(rows.map(row => row.is_pr_assistance)).toEqual([false, true, true])
    // 35 × 6 is no rep PR: the 30 × 8 of the same session has less help and more reps.
    expect(rows.map(row => row.pr_rep_counts)).toEqual([null, [8], [8]])
  })

  test('the database rejects an exercise tracking weight and assistance', async () => {
    const { error } = await supabase
      .from('exercises')
      .insert({ name_es: `E2E assist check ${Date.now()}`, tracked_fields: ['weight', 'assistance', 'reps'], muscle_group_id: 1, user_id: userId })
      .select('id')
    expect(error?.code).toBe('23514')
  })

  test('convert_user_weights converts best_assistance with the rest of the weights', async () => {
    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .insert({ user_id: userId, name: `E2E assist gym ${Date.now()}` })
      .select('id')
      .single()
    if (gymErr) throw gymErr
    gymIds.push(gym.id)
    const exerciseId = await createExercise('convert', ['assistance', 'reps'])
    await insertStats(exerciseId, await createSession(0, gym.id), 0, { best_assistance: 20, best_per_reps: { 8: 20 } }, gym.id)

    const { error } = await supabase.rpc('convert_user_weights', {
      p_scope: 'exercise', p_factor: 2.20462262, p_exercise_id: exerciseId, p_old_unit: 'kg', p_gym_id: gym.id,
    })

    expect(error).toBeNull()
    const [row] = await readRows(exerciseId)
    expect(Number(row.best_assistance)).toBe(44.09)
    expect(row.best_per_reps).toEqual({ 8: 44.09 })
  })
})
