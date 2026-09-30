import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'
import { findOrCreateExercise } from './supersetRoutines.js'

// History → "Convert to routine day" (issue #116). The only test that calls
// `create_routine_day_with_exercises` (migration 067) for real: without it a column renamed in
// `routine_exercises` would only fail in production. Runs on its OWN user (`supabase/seed.sql`):
// History opens today's first session, and the shared user gets sessions from the other specs.
const EMAIL = process.env.E2E_HISTORY_TEST_EMAIL
const PASSWORD = process.env.E2E_HISTORY_TEST_PASSWORD
if (!EMAIL || !PASSWORD) {
  throw new Error('Faltan E2E_HISTORY_TEST_EMAIL y E2E_HISTORY_TEST_PASSWORD en apps/web/.env.local (ver .env.example).')
}

const DAY_NAME = 'Día Historial E2E'
const EXERCISE_NAME = 'E2E Convertir'
const NEW_ROUTINE_NAME = 'Rutina Convertida E2E'
const SETS_DONE = 2

// Its own login, not the shared `.auth/user.json` of the other user.
test.use({ storageState: { cookies: [], origins: [] } })

/** Supabase client signed in as this spec's user, from Node. It does not sign out (see reorderExercises.spec.js). */
async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  expect(error).toBeNull()
  return { supabase, userId: data.user.id }
}

/**
 * A free workout completed today: one exercise, planned for 4 sets, 2 of them done. Anything a
 * previous attempt left (sessions, the converted routine) goes first: the DB is reset per run, not
 * per retry.
 */
async function prepare() {
  const { supabase, userId } = await signedInClient()
  const { error: sessionsError } = await supabase.from('workout_sessions').delete().eq('user_id', userId)
  if (sessionsError) throw sessionsError
  const { error: routinesError } = await supabase.from('routines').delete().eq('user_id', userId).eq('name', NEW_ROUTINE_NAME)
  if (routinesError) throw routinesError

  const { data: muscleGroups } = await supabase.from('muscle_groups').select('id').limit(1)
  const exerciseId = await findOrCreateExercise(supabase, userId, EXERCISE_NAME, muscleGroups[0].id)

  const now = new Date().toISOString()
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, status: 'completed', started_at: now, completed_at: now, day_name: DAY_NAME })
    .select('id')
    .single()
  if (sessionError) throw sessionError

  const { data: sessionExercise, error: exerciseError } = await supabase
    .from('session_exercises')
    .insert({ session_id: session.id, exercise_id: exerciseId, sort_order: 1, series: 4, reps: '10', rest_seconds: 90 })
    .select('id')
    .single()
  if (exerciseError) throw exerciseError

  const sets = Array.from({ length: SETS_DONE }, (_, index) => ({
    session_id: session.id,
    session_exercise_id: sessionExercise.id,
    set_number: index + 1,
    weight: 50,
    reps_completed: 10,
    completed: true,
  }))
  const { error: setsError } = await supabase.from('completed_sets').insert(sets)
  if (setsError) throw setsError

  return supabase
}

async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

test('convierte una sesión del historial en el día de una rutina nueva', async ({ page }) => {
  const supabase = await prepare()
  await login(page)

  await page.goto('/history')
  const title = page.getByText(DAY_NAME, { exact: true })
  await expect(title).toBeVisible({ timeout: 10000 })
  // The session's menu is the button right after its title.
  await title.locator('xpath=following-sibling::button[1]').click()
  await page.getByRole('button', { name: 'Convertir en día de rutina' }).click()

  await page.getByRole('radio', { name: 'Nueva rutina' }).click()
  await page.locator('label', { hasText: 'Nombre de la rutina' }).locator('xpath=following-sibling::input').fill(NEW_ROUTINE_NAME)
  await page.getByRole('button', { name: 'Crear día' }).click()

  // Lands on the routine with the new day open: its exercise is visible without a click.
  await expect(page).toHaveURL(/\/routine\/\d+$/, { timeout: 10000 })
  await expect(page.getByRole('heading', { name: DAY_NAME })).toBeVisible()
  await expect(page.getByText(EXERCISE_NAME, { exact: true })).toBeVisible()

  const routineId = Number(page.url().match(/\/routine\/(\d+)$/)[1])
  const { data: rows, error } = await supabase
    .from('routine_exercises')
    .select('series, reps, sort_order, is_warmup, superset_group, exercise:exercises(name_es), routine_days!inner(name, routine_id)')
    .eq('routine_days.routine_id', routineId)
  if (error) throw error
  // `series` is the sets done, not the 4 planned.
  expect(rows).toEqual([expect.objectContaining({
    series: SETS_DONE,
    reps: '10',
    sort_order: 1,
    is_warmup: false,
    superset_group: null,
    exercise: { name_es: EXERCISE_NAME },
    routine_days: { name: DAY_NAME, routine_id: routineId },
  })])
})
