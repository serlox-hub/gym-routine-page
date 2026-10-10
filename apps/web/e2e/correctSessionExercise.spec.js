import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'
import { findOrCreateExercise } from './supersetRoutines.js'

// The bare `correct_session_exercise` RPC (issue #168): fixing the exercise of a past session keeps
// its sets. No browser: every case is a database answer. The sessions are dated 2020 so no
// calendar or "recent" view of the other specs sharing this user ever shows them, and each test
// deletes its own.
const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

const STARTED_AT = '2020-01-15T10:00:00Z'

async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  expect(error).toBeNull()
  return { supabase, userId: data.user.id }
}

async function createExercise(supabase, userId, name, trackedFields) {
  const id = await findOrCreateExercise(supabase, userId, name, 1)
  const { error } = await supabase.from('exercises').update({ tracked_fields: trackedFields }).eq('id', id)
  if (error) throw error
  return id
}

/** A session with one exercise row and two weighted sets, plus that exercise's stats row. */
async function seedSession(supabase, userId, exerciseId, status = 'completed') {
  const { data: session, error: sErr } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, status, started_at: STARTED_AT, completed_at: status === 'completed' ? STARTED_AT : null })
    .select('id')
    .single()
  if (sErr) throw sErr

  const { data: row, error: rErr } = await supabase
    .from('session_exercises')
    .insert({ session_id: session.id, exercise_id: exerciseId, sort_order: 1, series: 2, reps: '10' })
    .select('id')
    .single()
  if (rErr) throw rErr

  const { error: setErr } = await supabase.from('completed_sets').insert([
    { session_id: session.id, session_exercise_id: row.id, set_number: 1, weight: 100, reps_completed: 10, completed: true },
    { session_id: session.id, session_exercise_id: row.id, set_number: 2, weight: 12.5, reps_completed: 8, completed: true },
  ])
  if (setErr) throw setErr

  const { error: statsErr } = await supabase.from('exercise_session_stats').insert({
    user_id: userId, exercise_id: exerciseId, session_id: session.id, session_date: STARTED_AT, best_weight: 100, total_sets: 2,
  })
  if (statsErr) throw statsErr

  return { sessionId: session.id, rowId: row.id }
}

function correct(supabase, rowId, newExerciseId, factor = 1) {
  return supabase.rpc('correct_session_exercise', {
    p_session_exercise_id: rowId,
    p_new_exercise_id: newExerciseId,
    p_weight_factor: factor,
  })
}

async function setWeights(supabase, rowId) {
  const { data, error } = await supabase
    .from('completed_sets')
    .select('set_number, weight, reps_completed')
    .eq('session_exercise_id', rowId)
    .order('set_number')
  if (error) throw error
  return data.map(({ weight, reps_completed }) => [Number(weight), reps_completed])
}

test.describe('correct_session_exercise RPC', () => {
  let supabase
  let userId
  let cable
  let dumbbell
  let treadmill
  const sessionIds = []

  test.beforeAll(async () => {
    ({ supabase, userId } = await signedInClient())
    cable = await createExercise(supabase, userId, 'E2E Corrección Polea', ['weight', 'reps'])
    // Same fields stored in the other order: the RPC compares them as sets.
    dumbbell = await createExercise(supabase, userId, 'E2E Corrección Mancuerna', ['reps', 'weight'])
    treadmill = await createExercise(supabase, userId, 'E2E Corrección Cinta', ['time'])
  })

  test.afterEach(async () => {
    if (sessionIds.length === 0) return
    const { error } = await supabase.from('workout_sessions').delete().in('id', sessionIds.splice(0))
    if (error) throw error
  })

  async function seed(status) {
    const seeded = await seedSession(supabase, userId, cable, status)
    sessionIds.push(seeded.sessionId)
    return seeded
  }

  test('moves the row to the new exercise keeping its sets, and drops the old stats row', async () => {
    const { sessionId, rowId } = await seed()

    const { error } = await correct(supabase, rowId, dumbbell)

    expect(error).toBeNull()
    const { data: row } = await supabase.from('session_exercises').select('exercise_id').eq('id', rowId).single()
    expect(row.exercise_id).toBe(dumbbell)
    expect(await setWeights(supabase, rowId)).toEqual([[100, 10], [12.5, 8]])
    const { data: stats } = await supabase.from('exercise_session_stats').select('exercise_id').eq('session_id', sessionId)
    expect(stats).toEqual([])
  })

  test('keeps the old exercise stats row while another row of the session still uses it', async () => {
    const { sessionId, rowId } = await seed()
    const { error: insertErr } = await supabase
      .from('session_exercises')
      .insert({ session_id: sessionId, exercise_id: cable, sort_order: 2, series: 1, reps: '10' })
    if (insertErr) throw insertErr

    const { error } = await correct(supabase, rowId, dumbbell)

    expect(error).toBeNull()
    const { data: stats } = await supabase.from('exercise_session_stats').select('exercise_id').eq('session_id', sessionId)
    expect(stats).toEqual([{ exercise_id: cable }])
  })

  test('converts the weights with the factor, rounded to 2 decimals', async () => {
    const { rowId } = await seed()

    const { error } = await correct(supabase, rowId, dumbbell, 2.20462262)

    expect(error).toBeNull()
    expect(await setWeights(supabase, rowId)).toEqual([[220.46, 10], [27.56, 8]])
  })

  test('is a no-op when the row already has that exercise (a retry never converts twice)', async () => {
    const { rowId } = await seed()

    const { error } = await correct(supabase, rowId, cable, 2.20462262)

    expect(error).toBeNull()
    expect(await setWeights(supabase, rowId)).toEqual([[100, 10], [12.5, 8]])
  })

  test('rejects an exercise that measures other fields', async () => {
    const { rowId } = await seed()

    const { error } = await correct(supabase, rowId, treadmill)

    expect(error?.message).toBe('tracked_fields_mismatch')
    expect(await setWeights(supabase, rowId)).toEqual([[100, 10], [12.5, 8]])
  })

  test('rejects a session that is not completed', async () => {
    const { rowId } = await seed('abandoned')

    const { error } = await correct(supabase, rowId, dumbbell)

    expect(error?.message).toBe('session_not_completed')
  })

  test('rejects a deleted exercise', async () => {
    const { rowId } = await seed()
    const deleted = await createExercise(supabase, userId, `E2E Corrección Borrado ${Date.now()}`, ['weight', 'reps'])
    await supabase.from('exercises').update({ deleted_at: new Date().toISOString() }).eq('id', deleted)

    const { error } = await correct(supabase, rowId, deleted)

    expect(error?.message).toBe('exercise_not_available')
  })

  test('rejects a missing row and an invalid factor', async () => {
    const { rowId } = await seed()

    expect((await correct(supabase, -1, dumbbell)).error?.message).toBe('session_exercise_not_found')
    expect((await correct(supabase, rowId, dumbbell, 0)).error?.message).toBe('invalid_weight_factor')
    expect((await correct(supabase, rowId, dumbbell, null)).error?.message).toBe('invalid_weight_factor')
  })
})
