import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'
import { findOrCreateExercise } from './supersetRoutines.js'

// Share a routine by link (issues #139, #140): the owner (the shared e2e user, this project's
// storage state) creates the link; a visitor without a session opens it, logs in from it as a
// second user, lands back on it and imports it; the owner stops sharing and the link dies.
// The receiver is the History user (`supabase/seed.sql`): its spec only looks at its own sessions,
// and the routine imported here is deleted at the end.
const RECEIVER_EMAIL = process.env.E2E_HISTORY_TEST_EMAIL
const RECEIVER_PASSWORD = process.env.E2E_HISTORY_TEST_PASSWORD
if (!RECEIVER_EMAIL || !RECEIVER_PASSWORD) {
  throw new Error('Missing E2E_HISTORY_TEST_EMAIL and E2E_HISTORY_TEST_PASSWORD in apps/web/.env.local (see .env.example).')
}

const ROUTINE_NAME = `Rutina Compartir E2E ${Date.now()}`
const LOGGED_OUT = { storageState: { cookies: [], origins: [] } }

test.describe.configure({ mode: 'serial' })

async function signedInClient(email, password) {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  expect(error).toBeNull()
  return { supabase, userId: data.user.id }
}

/** Day name plus its exercises in order, by name: what the receiver's copy must reproduce. */
async function readShape(supabase, routineId) {
  const { data, error } = await supabase
    .from('routines')
    .select('routine_days(name, sort_order, routine_exercises(sort_order, is_warmup, superset_group, series, reps, exercise:exercises(name_es)))')
    .eq('id', routineId)
    .single()
  if (error) throw error
  return [...data.routine_days]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(day => ({
      name: day.name,
      exercises: [...day.routine_exercises]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(row => [row.exercise.name_es, row.is_warmup, row.superset_group, row.series, row.reps]),
    }))
}

/** Replaces the share sheet with a recorder: headless Chromium has no share sheet to drive. */
async function recordShares(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data) => { window.__sharedUrl = data.url; return Promise.resolve() },
    })
  })
}

async function openRoutineMenu(page) {
  await page.locator('header button:has(svg.lucide-ellipsis-vertical)').click()
}

test.describe('Compartir rutina por enlace', () => {
  let owner
  let routineId
  let token

  test.beforeAll(async () => {
    owner = await signedInClient(process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD)
    const { supabase, userId } = owner
    const { data: muscleGroups } = await supabase.from('muscle_groups').select('id').limit(1)
    const exercise = (name) => findOrCreateExercise(supabase, userId, name, muscleGroups[0].id)
    const [warmup, first, second] = [
      await exercise('E2E Compartir Calentamiento'),
      await exercise('E2E Compartir A'),
      await exercise('E2E Compartir B'),
    ]

    const { data: routine, error } = await supabase
      .from('routines').insert({ name: ROUTINE_NAME, user_id: userId }).select().single()
    if (error) throw error
    routineId = routine.id
    const { data: day, error: dayError } = await supabase
      .from('routine_days').insert({ routine_id: routineId, name: 'Día Compartir', sort_order: 1 }).select().single()
    if (dayError) throw dayError
    const row = (exerciseId, fields) => ({ routine_day_id: day.id, exercise_id: exerciseId, user_id: userId, series: 3, reps: '10', is_warmup: false, ...fields })
    const { error: rowsError } = await supabase.from('routine_exercises').insert([
      row(warmup, { sort_order: 1, is_warmup: true }),
      row(first, { sort_order: 2, superset_group: 1 }),
      row(second, { sort_order: 3, superset_group: 1, notes: 'Nota del dueño' }),
    ])
    if (rowsError) throw rowsError
  })

  test.afterAll(async () => {
    await owner.supabase.from('routines').delete().eq('name', ROUTINE_NAME)
    const receiver = await signedInClient(RECEIVER_EMAIL, RECEIVER_PASSWORD)
    await receiver.supabase.from('routines').delete().eq('name', ROUTINE_NAME)
  })

  test('el dueño crea el enlace y lo comparte desde el paso "Enlace listo" y desde el menú', async ({ page }) => {
    await recordShares(page)
    await page.goto(`/routine/${routineId}`)
    await expect(page.getByText('Día Compartir')).toBeVisible()

    await openRoutineMenu(page)
    await page.getByRole('button', { name: 'Crear enlace para compartir' }).click()
    await page.getByRole('button', { name: 'Crear enlace', exact: true }).click()

    // Creating the link lands on a step one tap from sharing it, showing the link
    await expect(page.getByText('Enlace listo')).toBeVisible()
    await page.getByRole('button', { name: 'Compartir', exact: true }).click()
    const url = await page.evaluate(() => window.__sharedUrl)
    expect(url).toMatch(/\/r\/[A-Za-z0-9_-]{22}$/)
    await expect(page.getByText(url)).toBeVisible()
    token = url.split('/r/')[1]
    await page.getByRole('button', { name: 'Cerrar' }).click()

    // Once shared, the menu shares the same link directly
    await page.evaluate(() => { window.__sharedUrl = null })
    await openRoutineMenu(page)
    await page.getByRole('button', { name: 'Compartir enlace' }).click()
    expect(await page.evaluate(() => window.__sharedUrl)).toBe(url)
  })

  test('sin sesión se ve la rutina y se ofrece crear cuenta o entrar, nunca importar', async ({ browser }) => {
    const context = await browser.newContext(LOGGED_OUT)
    const page = await context.newPage()
    await page.goto(`/r/${token}`)

    await expect(page.getByRole('heading', { name: ROUTINE_NAME })).toBeVisible()
    await expect(page.getByText('Nota del dueño')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crea una cuenta para importarla' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ya tengo cuenta' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Importar a mis rutinas' })).toHaveCount(0)
    await context.close()
  })

  test('otro usuario entra desde el enlace, vuelve a él e importa la rutina en el mismo orden', async ({ browser }) => {
    const context = await browser.newContext(LOGGED_OUT)
    const page = await context.newPage()
    await page.goto(`/r/${token}`)

    await page.getByRole('button', { name: 'Ya tengo cuenta' }).click()
    await page.locator('#email').fill(RECEIVER_EMAIL)
    await page.locator('#password').fill(RECEIVER_PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()

    // Home sends a visitor who left a shared routine to log in back to it
    await expect(page).toHaveURL(new RegExp(`/r/${token}$`), { timeout: 10_000 })
    await page.getByRole('button', { name: 'Importar a mis rutinas' }).click()
    await expect(page).toHaveURL(/\/routine\/\d+$/, { timeout: 10_000 })
    const copyId = Number(page.url().match(/\/routine\/(\d+)$/)[1])

    const receiver = await signedInClient(RECEIVER_EMAIL, RECEIVER_PASSWORD)
    expect(await readShape(receiver.supabase, copyId)).toEqual(await readShape(owner.supabase, routineId))
    await context.close()
  })

  test('el dueño deja de compartir y el enlace deja de funcionar', async ({ page, browser }) => {
    await page.goto(`/routine/${routineId}`)
    await expect(page.getByText('Día Compartir')).toBeVisible()
    await openRoutineMenu(page)
    await page.getByRole('button', { name: 'Dejar de compartir' }).click()
    // The menu item is gone once the menu closes: the only one left is the confirmation's
    await page.getByRole('button', { name: 'Dejar de compartir' }).last().click()
    // The toast's `.sr-only` live region holds the same text: read that one
    await expect(page.locator('[role="status"].sr-only')).toHaveText('Ya no se comparte')

    const context = await browser.newContext(LOGGED_OUT)
    const visitor = await context.newPage()
    await visitor.goto(`/r/${token}`)
    await expect(visitor.getByText('Este enlace ya no funciona')).toBeVisible()
    await context.close()
  })
})
