import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import '../scripts/loadEnv.js'
import { queryLocalDatabase } from '../scripts/localDatabase.js'

// Converting a weight unit recomputes best_1rm from the converted sets instead of scaling it (issue
// #194): scaled, 65 kg × 8 (1RM 82) became 180.78 lb, and its converted set 143.3 lb × 8 gives 182,
// so repeating it was a 1RM PR. Like recalculatePRRule.spec.js: no browser, every case is a database
// answer, each test gets its own exercise and deletes it with its sessions, dated 2020 so no
// calendar or "recent" view of the other specs sharing this user shows them.
//   - convert_user_weights: the stored best equals the 1RM of its converted set. The end of a session
//     only marks a 1RM PR above it, so a repeated set is none live; History is recalculate_exercise_prs.
//   - rebuild_best_1rm_for_user, the code migration 076 ran for every user: rows a conversion scaled
//     and the 1-rep rows of 019 are fixed, and rows that already match are not written. It is internal
//     (no API role may call it), so it runs as the database owner, through the local CLI, narrowed to
//     the test's exercise: the other specs share this user.
const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD
const WEB_DIR = path.resolve(import.meta.dirname, '..')

// The factors weightConversion.js sends.
const KG_TO_LB = 2.20462262
const LB_TO_KG = 0.45359237

const FLAG_COLUMNS = ['is_pr_weight', 'is_pr_reps', 'is_pr_1rm', 'is_pr_volume', 'is_pr_time', 'is_pr_distance', 'is_pr_pace', 'is_pr_assistance']

const NO_RECORD = {
  ...Object.fromEntries(FLAG_COLUMNS.map(column => [column, false])),
  pr_rep_counts: null,
}

// Every flag up, so a false read back is the recalculation's answer and not the column default.
const STALE_RECORD = {
  ...Object.fromEntries(FLAG_COLUMNS.map(column => [column, true])),
  pr_rep_counts: [99],
}

const flagsOf = ({ best_1rm: _best1rm, ...flags }) => flags

async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  expect(error).toBeNull()
  return { supabase, userId: data.user.id }
}

const startedAt = (day) => new Date(Date.UTC(2020, 1, 1 + day, 10)).toISOString()

test.describe('best_1rm is what the sets give, also after a unit conversion', () => {
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

  async function createExercise(name, trackedFields = ['weight', 'reps']) {
    const { data, error } = await supabase
      .from('exercises')
      .insert({ name_es: `E2E 1RM ${name} ${Date.now()}`, tracked_fields: trackedFields, muscle_group_id: 1, user_id: userId })
      .select('id')
      .single()
    if (error) throw error
    exerciseIds.push(data.id)
    return data.id
  }

  async function createGym() {
    const { data, error } = await supabase
      .from('gyms')
      .insert({ user_id: userId, name: `E2E 1RM gym ${Date.now()}` })
      .select('id')
      .single()
    if (error) throw error
    gymIds.push(data.id)
    return data.id
  }

  /**
   * A completed session of one exercise: its sets ([weight, reps] or [weight, reps, seconds]) and
   * its exercise_session_stats row as given, flags included.
   */
  async function seedSession(exerciseId, { day, gymId = null, sets, stats }) {
    const { data: session, error: sErr } = await supabase
      .from('workout_sessions')
      .insert({ user_id: userId, status: 'completed', started_at: startedAt(day), completed_at: startedAt(day), gym_id: gymId })
      .select('id')
      .single()
    if (sErr) throw sErr
    sessionIds.push(session.id)

    const { data: sessionExercise, error: seErr } = await supabase
      .from('session_exercises')
      .insert({ session_id: session.id, exercise_id: exerciseId, sort_order: 0, series: sets.length, reps: '8' })
      .select('id')
      .single()
    if (seErr) throw seErr

    const { error: setsErr } = await supabase.from('completed_sets').insert(sets.map(([weight, reps, seconds = null], i) => ({
      session_id: session.id, session_exercise_id: sessionExercise.id, set_number: i + 1,
      weight, reps_completed: reps, time_seconds: seconds,
    })))
    if (setsErr) throw setsErr

    const { error: statsErr } = await supabase.from('exercise_session_stats').insert({
      user_id: userId, exercise_id: exerciseId, session_id: session.id, session_date: startedAt(day),
      total_sets: sets.length, gym_id: gymId, ...NO_RECORD, ...stats,
    })
    if (statsErr) throw statsErr
  }

  async function readRows(exerciseId) {
    const { data, error } = await supabase
      .from('exercise_session_stats')
      .select(`best_1rm, ${FLAG_COLUMNS.join(', ')}, pr_rep_counts`)
      .eq('exercise_id', exerciseId)
      .order('session_date')
    if (error) throw error
    return data
  }

  const readBest1rms = async (exerciseId) => (await readRows(exerciseId)).map(row => Number(row.best_1rm))

  async function convert(exerciseId, gymId, factor) {
    const { error } = await supabase.rpc('convert_user_weights', {
      p_scope: 'exercise', p_factor: factor, p_exercise_id: exerciseId, p_old_unit: null, p_gym_id: gymId,
    })
    expect(error).toBeNull()
  }

  // What History does after an edit.
  async function recalculatePRs(exerciseId, gymId = null) {
    const { error } = await supabase.rpc('recalculate_exercise_prs', {
      p_exercise_id: exerciseId, p_after_date: '2020-01-01T00:00:00Z', p_gym_id: gymId,
    })
    expect(error).toBeNull()
  }

  const rebuild = (exerciseId) =>
    queryLocalDatabase(WEB_DIR, `SELECT rebuild_best_1rm_for_user('${userId}'::uuid, ${Number(exerciseId)})`)

  // xmin is the transaction that last wrote the row: unchanged means not written.
  const readXmins = (exerciseId) =>
    queryLocalDatabase(WEB_DIR, `SELECT xmin::text AS xmin FROM exercise_session_stats WHERE exercise_id = ${Number(exerciseId)} ORDER BY session_date`)
      .map(row => row.xmin)

  test('kg → lb: 65 kg × 8 stores 182, the 1RM of its converted set, and repeating that set is no record', async () => {
    const gymId = await createGym()
    const exerciseId = await createExercise('kg to lb')
    await seedSession(exerciseId, {
      day: 0, gymId, sets: [[65, 8]],
      stats: { best_weight: 65, best_reps: 8, best_1rm: 82, total_volume: 520, best_per_reps: { 8: 65 } },
    })

    await convert(exerciseId, gymId, KG_TO_LB)

    const { data: sets, error } = await supabase.from('completed_sets').select('weight').eq('session_id', sessionIds[0])
    if (error) throw error
    expect(sets.map(set => Number(set.weight))).toEqual([143.3])
    // calculateEpley1RM(143.3, 8) = 182, and the end of a session marks a 1RM PR only above this.
    expect(await readBest1rms(exerciseId)).toEqual([182])

    // The same set the next session, stored as the app stores it, judged as History judges it.
    await seedSession(exerciseId, {
      day: 1, gymId, sets: [[143.3, 8]],
      stats: { ...STALE_RECORD, best_weight: 143.3, best_reps: 8, best_1rm: 182, total_volume: 1146.4, best_per_reps: { 8: 143.3 } },
    })
    await recalculatePRs(exerciseId, gymId)

    const rows = await readRows(exerciseId)
    expect(rows.map(flagsOf)).toEqual([NO_RECORD, NO_RECORD])
  })

  test('lb → kg: 185 lb × 5 stores 98; 83.91 kg × 5 is no record, 84.5 kg × 5 (1RM 99) is', async () => {
    const gymId = await createGym()
    const exerciseId = await createExercise('lb to kg')
    await seedSession(exerciseId, {
      day: 0, gymId, sets: [[185, 5]],
      stats: { best_weight: 185, best_reps: 5, best_1rm: 216, total_volume: 925, best_per_reps: { 5: 185 } },
    })

    await convert(exerciseId, gymId, LB_TO_KG)

    expect(await readBest1rms(exerciseId)).toEqual([98])

    await seedSession(exerciseId, {
      day: 1, gymId, sets: [[83.91, 5]],
      stats: { ...STALE_RECORD, best_weight: 83.91, best_reps: 5, best_1rm: 98, total_volume: 419.55, best_per_reps: { 5: 83.91 } },
    })
    await seedSession(exerciseId, {
      day: 2, gymId, sets: [[84.5, 5]],
      stats: { best_weight: 84.5, best_reps: 5, best_1rm: 99, total_volume: 422.5, best_per_reps: { 5: 84.5 } },
    })
    await recalculatePRs(exerciseId, gymId)

    const rows = await readRows(exerciseId)
    expect(flagsOf(rows[1])).toEqual(NO_RECORD)
    expect(rows[2]).toMatchObject({ is_pr_1rm: true })
  })

  test('weight × reps × time: best_1rm is recomputed too, the chart plots 182', async () => {
    const gymId = await createGym()
    const exerciseId = await createExercise('with time', ['weight', 'reps', 'time'])
    await seedSession(exerciseId, {
      day: 0, gymId, sets: [[65, 8, 30]],
      stats: { best_weight: 65, best_reps: 8, best_1rm: 82, total_volume: 520, best_time_seconds: 30, best_per_reps: { 8: 65 } },
    })

    await convert(exerciseId, gymId, KG_TO_LB)

    expect(await readBest1rms(exerciseId)).toEqual([182])
  })

  test('converting one gym rebuilds only that gym', async () => {
    const convertedGymId = await createGym()
    const otherGymId = await createGym()
    const exerciseId = await createExercise('one gym')
    await seedSession(exerciseId, {
      day: 0, gymId: convertedGymId, sets: [[65, 8]],
      stats: { best_weight: 65, best_reps: 8, best_1rm: 82, total_volume: 520, best_per_reps: { 8: 65 } },
    })
    // Stale on purpose: rebuilt, it would become 182.
    await seedSession(exerciseId, {
      day: 1, gymId: otherGymId, sets: [[143.3, 8]],
      stats: { best_weight: 143.3, best_reps: 8, best_1rm: 180.78, total_volume: 1146.4, best_per_reps: { 8: 143.3 } },
    })

    await convert(exerciseId, convertedGymId, KG_TO_LB)

    expect(await readBest1rms(exerciseId)).toEqual([182, 180.78])
  })

  test('rebuild (migration 076): a scaled best becomes what its set gives, and the false PR it fired goes', async () => {
    const exerciseId = await createExercise('scaled')
    // What a conversion left: 82 kg scaled to 180.78 lb, its set converted to 143.3 lb × 8.
    await seedSession(exerciseId, {
      day: 0, sets: [[143.3, 8]],
      stats: { best_weight: 143.3, best_reps: 8, best_1rm: 180.78, total_volume: 1146.4, best_per_reps: { 8: 143.3 } },
    })
    // The same set repeated, which the end of the session marked as a 1RM PR (182 > 180.78).
    await seedSession(exerciseId, {
      day: 1, sets: [[143.3, 8]],
      stats: { best_weight: 143.3, best_reps: 8, best_1rm: 182, total_volume: 1146.4, best_per_reps: { 8: 143.3 }, is_pr_1rm: true },
    })

    rebuild(exerciseId)

    const rebuilt = await readRows(exerciseId)
    expect(rebuilt.map(row => Number(row.best_1rm))).toEqual([182, 182])
    expect(rebuilt.map(flagsOf)).toEqual([NO_RECORD, NO_RECORD])
    // The flags are those of the PR rule itself.
    await recalculatePRs(exerciseId)
    expect(await readRows(exerciseId)).toEqual(rebuilt)
  })

  test('rebuild (migration 076): 100 × 1 stored as 103 by 019 becomes 100', async () => {
    const exerciseId = await createExercise('one rep')
    await seedSession(exerciseId, {
      day: 0, sets: [[100, 1]],
      stats: { best_weight: 100, best_reps: 1, best_1rm: 103, total_volume: 100, best_per_reps: { 1: 100 } },
    })

    rebuild(exerciseId)

    expect(await readBest1rms(exerciseId)).toEqual([100])
  })

  test('rebuild (migration 076): rows that already match are not written', async () => {
    const exerciseId = await createExercise('consistent')
    // Stale flags: a recalculation would clear them, so they also show none ran.
    await seedSession(exerciseId, {
      day: 0, sets: [[65, 8]],
      stats: { ...STALE_RECORD, best_weight: 65, best_reps: 8, best_1rm: 82, total_volume: 520, best_per_reps: { 8: 65 } },
    })
    await seedSession(exerciseId, {
      day: 1, sets: [[100, 1], [65, 8]],
      stats: { ...STALE_RECORD, best_weight: 100, best_reps: 8, best_1rm: 100, total_volume: 620, best_per_reps: { 1: 100, 8: 65 } },
    })
    // 0.4 × 2 has a 1RM of 0, which the app stores as no 1RM at all.
    await seedSession(exerciseId, {
      day: 2, sets: [[0.4, 2]],
      stats: { ...STALE_RECORD, best_weight: 0.4, best_reps: 2, best_1rm: null, total_volume: 0.8, best_per_reps: { 2: 0.4 } },
    })
    const xminsBefore = readXmins(exerciseId)
    const rowsBefore = await readRows(exerciseId)

    rebuild(exerciseId)

    expect(readXmins(exerciseId)).toEqual(xminsBefore)
    expect(await readRows(exerciseId)).toEqual(rowsBefore)
  })
})
