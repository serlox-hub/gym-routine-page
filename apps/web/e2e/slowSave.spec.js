import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'
import { seedRoutine, findOrCreateExercise } from './supersetRoutines.js'

// Slow and failed saves inside the modal the user is waiting in (issue #121): adding an exercise to
// the session and ending it. Runs on its OWN user (`supabase/seed.sql`): only one session can be in
// progress per user (migration 058), and with the shared user it would race the other session specs.
const EMAIL = process.env.E2E_SLOW_TEST_EMAIL
const PASSWORD = process.env.E2E_SLOW_TEST_PASSWORD
if (!EMAIL || !PASSWORD) {
  throw new Error('Missing E2E_SLOW_TEST_EMAIL and E2E_SLOW_TEST_PASSWORD in apps/web/.env.local (see .env.example).')
}

const ROUTINE = {
  name: 'Rutina Lenta E2E',
  description: 'Día para los e2e de guardado lento',
  days: [{ name: 'Día Lento E2E', exercises: [['E2E Lento Base', null]] }],
}
const DAY_NAME = ROUTINE.days[0].name
const BASE_EXERCISE = ROUTINE.days[0].exercises[0][0]
// The exercise every test adds. Created in `prepare`, never in the routine.
const EXTRA_EXERCISE = 'E2E Lento Extra'

const ADD_RPC = '**/rest/v1/rpc/add_session_exercise'
const SLOW_TEXT = 'Conexión lenta, sigo intentándolo...'
const ADD_FAILED = 'No se pudo añadir el ejercicio. Inténtalo de nuevo.'
const END_FAILED = 'No se pudo finalizar el entrenamiento. Inténtalo de nuevo.'
const SCOPE_TITLE = '¿Solo hoy o también en la rutina?'
const ADD_TITLE = 'Añadir ejercicio'
// Playwright's default `expect` timeout is 5 s, the same as the slow threshold.
const SLOW_TIMEOUT = { timeout: 10_000 }

// Its own login in each test, not the shared `.auth/user.json` of the other user.
test.use({ storageState: { cookies: [], origins: [] } })
// Every test starts a session of the same user: in parallel they would abandon each other's.
test.describe.configure({ mode: 'serial' })

/** Seeds the routine and the extra exercise (once) and removes any session a previous test left. */
async function prepare() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  expect(error).toBeNull()
  const userId = data.user.id

  await seedRoutine(supabase, userId, ROUTINE)
  const { data: muscleGroups } = await supabase.from('muscle_groups').select('id').limit(1)
  await findOrCreateExercise(supabase, userId, EXTRA_EXERCISE, muscleGroups[0].id)
  const { error: sessionsError } = await supabase.from('workout_sessions').delete().eq('user_id', userId)
  if (sessionsError) throw sessionsError
}

async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

async function startRoutineSession(page) {
  await prepare()
  await login(page)
  await page.goto('/routines')
  await page.getByText(ROUTINE.name, { exact: true }).first().click()
  await expect(page).toHaveURL(/\/routine\/\d+$/)
  await page.getByRole('heading', { name: DAY_NAME }).click()
  // The day card's play button has no text: it is found by its icon.
  await page.locator('button:has(svg.lucide-play)').first().click()
  await expect(page).toHaveURL(/\/workout/, { timeout: 10000 })
  await expect(sessionExercise(page, BASE_EXERCISE)).toHaveCount(1, { timeout: 10000 })
}

async function startFreeSession(page) {
  await prepare()
  await login(page)
  await page.getByRole('button', { name: 'Entrenamiento libre' }).click()
  await expect(page).toHaveURL(/\/workout\/free/, { timeout: 10000 })
}

/** The open modal whose title is `title` (its content box, child of the full-screen overlay). */
function modal(page, title) {
  return page.locator('div.fixed.inset-0 > div').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
}

function sessionExercise(page, name) {
  return page.locator('main').getByRole('heading', { level: 4, name, exact: true })
}

// The toast's live region is always mounted and holds the message being shown, or nothing. `.sr-only`
// tells it from the `SaveStatus` region of an open modal, which has the same role.
function toast(page) {
  return page.locator('div.sr-only[role="status"][aria-live="polite"]')
}

/**
 * Read once, never retried: a retrying `toHaveText('')` would wait out the toast's 3 s and pass.
 * Called once the inline error shows: the hook-level `onError` that would toast runs before the
 * mutation turns to error, so a toast would already be on screen.
 */
async function expectNoToast(page) {
  expect(await toast(page).textContent()).toBe('')
}

/** Taps the overlay, outside the modal box. */
async function tapOutside(page) {
  await page.mouse.click(5, 5)
}

/** Opens the add modal, picks the extra exercise and submits its config form with the defaults. */
async function submitAddForm(page) {
  await page.getByRole('button', { name: ADD_TITLE }).click()
  const addModal = modal(page, ADD_TITLE)
  await addModal.getByPlaceholder('Buscar ejercicio...').fill(EXTRA_EXERCISE)
  await addModal.getByRole('heading', { level: 4, name: EXTRA_EXERCISE, exact: true }).click()
  await addModal.getByRole('button', { name: 'Añadir', exact: true }).click()
  return addModal
}

/** The add RPC waits until the test lets it through or fails it. */
async function holdAddRpc(page) {
  let decide
  const decision = new Promise(resolve => { decide = resolve })
  await page.route(ADD_RPC, async route => {
    if (await decision === 'abort') await route.abort()
    else await route.continue()
  })
  return { release: () => decide('continue'), abort: () => decide('abort') }
}

/** Every add RPC fails as if there were no network. Returns how many were sent. */
async function failAddRpc(page) {
  const calls = { count: 0 }
  await page.route(ADD_RPC, route => {
    calls.count++
    return route.abort()
  })
  return calls
}

test.describe('Routine workout: the add-scope dialog waits for the add', () => {
  test('a slow add keeps the dialog open with the pressed button pending, then the slow notice, and lands once', async ({ page }) => {
    await startRoutineSession(page)
    const rpc = await holdAddRpc(page)

    await submitAddForm(page)
    const dialog = modal(page, SCOPE_TITLE)
    await dialog.getByRole('button', { name: 'Solo hoy' }).click()

    await expect(dialog.getByRole('button', { name: 'Cargando...' })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'También en la rutina' })).toBeDisabled()
    await expect(dialog.getByText(SLOW_TEXT)).toBeVisible(SLOW_TIMEOUT)

    rpc.release()
    await expect(dialog).toBeHidden()
    await expect(sessionExercise(page, EXTRA_EXERCISE)).toHaveCount(1)
  })

  test('a failed add shows the error in the dialog with no toast, and pressing again adds it once', async ({ page }) => {
    await startRoutineSession(page)
    await failAddRpc(page)

    await submitAddForm(page)
    const dialog = modal(page, SCOPE_TITLE)
    await dialog.getByRole('button', { name: 'Solo hoy' }).click()

    await expect(dialog.getByText(ADD_FAILED)).toBeVisible()
    await expectNoToast(page)

    await page.unroute(ADD_RPC)
    await dialog.getByRole('button', { name: 'Solo hoy' }).click()
    await expect(dialog).toBeHidden()
    await expect(sessionExercise(page, EXTRA_EXERCISE)).toHaveCount(1)
  })

  test('closing the dialog while the add is pending lets it go on, and its later failure is toasted', async ({ page }) => {
    await startRoutineSession(page)
    const rpc = await holdAddRpc(page)

    await submitAddForm(page)
    const dialog = modal(page, SCOPE_TITLE)
    await dialog.getByRole('button', { name: 'Solo hoy' }).click()
    await expect(dialog.getByRole('button', { name: 'Cargando...' })).toBeVisible()

    await tapOutside(page)
    await expect(dialog).toBeHidden()

    rpc.abort()
    await expect(toast(page)).toHaveText(ADD_FAILED)
    await expect(sessionExercise(page, EXTRA_EXERCISE)).toHaveCount(0)
  })

  test('closing the dialog after a failed add adds nothing and shows no toast', async ({ page }) => {
    await startRoutineSession(page)
    const calls = await failAddRpc(page)

    await submitAddForm(page)
    const dialog = modal(page, SCOPE_TITLE)
    await dialog.getByRole('button', { name: 'Solo hoy' }).click()
    await expect(dialog.getByText(ADD_FAILED)).toBeVisible()

    await tapOutside(page)
    await expect(dialog).toBeHidden()

    // Proving that nothing happens takes waiting for it not to: a second add would go out at once.
    await page.waitForTimeout(1000)
    expect(calls.count).toBe(1)
    await expectNoToast(page)
    await expect(sessionExercise(page, EXTRA_EXERCISE)).toHaveCount(0)
  })
})

test.describe('Free workout: the add modal shows the failure', () => {
  test('a failed add keeps the modal open with the error inline and no toast', async ({ page }) => {
    await startFreeSession(page)
    await failAddRpc(page)

    const addModal = await submitAddForm(page)

    await expect(addModal.getByText(ADD_FAILED)).toBeVisible()
    await expectNoToast(page)
  })

  test('closing the modal while the add is pending lets it go on, and its later failure is toasted', async ({ page }) => {
    await startFreeSession(page)
    const rpc = await holdAddRpc(page)

    const addModal = await submitAddForm(page)
    await expect(addModal.getByRole('button', { name: 'Cargando...' })).toBeDisabled()

    await tapOutside(page)
    await expect(addModal).toBeHidden()

    rpc.abort()
    await expect(toast(page)).toHaveText(ADD_FAILED)
    await expect(sessionExercise(page, EXTRA_EXERCISE)).toHaveCount(0)
  })

  test('going back to the picker while the add is pending lets it go on, and its later failure is toasted', async ({ page }) => {
    await startFreeSession(page)
    const rpc = await holdAddRpc(page)

    const addModal = await submitAddForm(page)
    await expect(addModal.getByRole('button', { name: 'Cargando...' })).toBeDisabled()

    await addModal.getByRole('button', { name: 'Volver' }).click()
    await expect(addModal.getByPlaceholder('Buscar ejercicio...')).toBeVisible()

    rpc.abort()
    await expect(toast(page)).toHaveText(ADD_FAILED)
  })
})

test.describe('Ending the workout', () => {
  test('a failed end shows the error in the end modal, and "Hecho" again ends the workout', async ({ page }) => {
    await startRoutineSession(page)

    // A completed set: without one the finish button is disabled. The first card starts expanded.
    const inputs = page.locator('main input')
    await inputs.nth(0).fill('50')
    await inputs.nth(1).fill('10')
    await page.getByRole('button', { name: 'Completar serie' }).first().click()
    // The rest timer opens full screen over the page: tapping above its sheet minimizes it.
    await tapOutside(page)

    const failWrites = route => (route.request().method() === 'GET' ? route.continue() : route.abort())
    await page.route('**/rest/v1/**', failWrites)

    await page.getByRole('button', { name: 'Terminar entrenamiento' }).click()
    const endModal = modal(page, 'Finalizar entrenamiento')
    await endModal.getByRole('button', { name: 'Hecho' }).click()

    await expect(endModal.getByText(END_FAILED)).toBeVisible()

    await page.unroute('**/rest/v1/**', failWrites)
    await endModal.getByRole('button', { name: 'Hecho' }).click()
    await expect(page).toHaveURL(/\/workout\/summary/, { timeout: 10000 })
  })
})
