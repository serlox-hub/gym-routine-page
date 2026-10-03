import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'
import { findOrCreateExercise } from './supersetRoutines.js'

// Duplicating a routine goes through the real SQL export (`routine_export_rows`, migration 068) and
// back through `importRoutine` (issue #139). The unit tests mock that RPC with a hand-written
// fixture, so this is the only test that catches a column the SQL function stops returning: the
// copy would lose it silently. Compared column by column against the original.
const ROUTINE_NAME = `Rutina Duplicar E2E ${Date.now()}`
const COPY_NAME = `${ROUTINE_NAME} (copia)`

const ROW_COLUMNS = 'exercise_id, series, target_field, reps, level, rir, rest_seconds, notes, sort_order, is_warmup, superset_group'

/**
 * Supabase client signed in as the e2e user, from Node. It does not sign out: by default that
 * revokes EVERY session of the user, the browser's one included.
 */
async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_TEST_EMAIL,
    password: process.env.E2E_TEST_PASSWORD,
  })
  expect(error).toBeNull()
  return { supabase, userId: data.user.id }
}

/** A routine with every prescription field the copy must keep: warm-up, a superset, empty and set levels, notes. */
async function seedSourceRoutine(supabase, userId) {
  const { data: muscleGroups } = await supabase.from('muscle_groups').select('id').limit(1)
  const exercise = (name) => findOrCreateExercise(supabase, userId, name, muscleGroups[0].id)
  const [warmup, first, second, single] = [
    await exercise('E2E Duplicar Calentamiento'),
    await exercise('E2E Duplicar A'),
    await exercise('E2E Duplicar B'),
    await exercise('E2E Duplicar C'),
  ]

  const { data: routine, error } = await supabase
    .from('routines')
    .insert({ name: ROUTINE_NAME, description: 'Rutina para el e2e de duplicar', user_id: userId })
    .select()
    .single()
  if (error) throw error

  const { data: days, error: daysError } = await supabase
    .from('routine_days')
    .insert([
      { routine_id: routine.id, name: 'Día Duplicar 1', estimated_duration_min: 60, sort_order: 1 },
      { routine_id: routine.id, name: 'Día Duplicar 2', estimated_duration_min: null, sort_order: 2 },
    ])
    .select()
  if (daysError) throw daysError
  const [dayOne, dayTwo] = [...days].sort((a, b) => a.sort_order - b.sort_order)

  const row = (dayId, exerciseId, fields) => ({
    routine_day_id: dayId, exercise_id: exerciseId, user_id: userId, series: 3, reps: '10',
    target_field: 'reps', level: null, rir: null, rest_seconds: null, notes: null, is_warmup: false, superset_group: null,
    ...fields,
  })
  const { error: rowsError } = await supabase.from('routine_exercises').insert([
    row(dayOne.id, warmup, { sort_order: 1, is_warmup: true, series: 1, reps: '15' }),
    row(dayOne.id, first, { sort_order: 2, superset_group: 1, rir: 2, rest_seconds: 90, notes: 'Agarre cerrado' }),
    row(dayOne.id, second, { sort_order: 3, superset_group: 1, rir: 1, reps: '8-12' }),
    row(dayOne.id, single, { sort_order: 4, level: 3, rest_seconds: 120 }),
    row(dayTwo.id, first, { sort_order: 1, series: 5, reps: '5' }),
  ])
  if (rowsError) throw rowsError
  return routine.id
}

/** The routine as plain data, without ids: what a copy must reproduce. */
async function readRoutine(supabase, routineId) {
  const { data, error } = await supabase
    .from('routines')
    .select(`name, description, routine_days(name, estimated_duration_min, sort_order, routine_exercises(${ROW_COLUMNS}))`)
    .eq('id', routineId)
    .single()
  if (error) throw error
  return {
    description: data.description,
    days: [...data.routine_days]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(day => ({
        ...day,
        routine_exercises: [...day.routine_exercises].sort((a, b) => a.sort_order - b.sort_order),
      })),
  }
}

test.describe('Duplicar rutina', () => {
  let supabase
  let sourceId

  test.beforeAll(async () => {
    const client = await signedInClient()
    supabase = client.supabase
    sourceId = await seedSourceRoutine(supabase, client.userId)
  })

  // The run's database is reset once, not per spec: leftover routines would move other specs' locators.
  test.afterAll(async () => {
    await supabase.from('routines').delete().in('name', [ROUTINE_NAME, COPY_NAME])
  })

  test('la copia conserva días, orden, calentamiento, superseries, niveles y notas', async ({ page }) => {
    await page.goto(`/routine/${sourceId}`)
    await expect(page.getByText('Día Duplicar 1')).toBeVisible()

    await page.locator('header button:has(svg.lucide-ellipsis-vertical)').click()
    await page.getByRole('button', { name: 'Duplicar rutina' }).click()

    await expect(page).not.toHaveURL(new RegExp(`/routine/${sourceId}$`), { timeout: 10_000 })
    const copyId = Number(page.url().match(/\/routine\/(\d+)/)[1])

    const [original, copy] = await Promise.all([readRoutine(supabase, sourceId), readRoutine(supabase, copyId)])
    const { data: copied } = await supabase.from('routines').select('name').eq('id', copyId).single()
    expect(copied.name).toBe(COPY_NAME)
    expect(copy).toEqual(original)
  })
})
