import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'
import { seedRoutine } from './supersetRoutines.js'
import { expectTouchTargets } from './touchTargets.js'

// Touch targets (issues #151, #152): every tap control of the screens used mid-workout, and of the
// ones for looking back (history, body metrics, gyms, charts), is at least 44px. A new screen, or a
// new state of one of these, gets its own measurement here.
//
// Runs on its OWN user (`supabase/seed.sql`): it starts sessions, and only one can be in progress
// per user (migration 058), and it adds a second gym, which would change what the other specs see.
const EMAIL = process.env.E2E_TOUCH_TEST_EMAIL
const PASSWORD = process.env.E2E_TOUCH_TEST_PASSWORD
if (!EMAIL || !PASSWORD) {
  throw new Error('Missing E2E_TOUCH_TEST_EMAIL and E2E_TOUCH_TEST_PASSWORD in apps/web/.env.local (see .env.example).')
}

// The time exercise goes first: the first card starts expanded, and its set row is where the
// execution timer shows once a time is typed. Then a weight + reps exercise and a superset.
const TIME_EXERCISE = 'E2E Toque Tiempo'
const WEIGHT_EXERCISE = 'E2E Toque Peso'
const ROUTINE = {
  name: 'Rutina Toque E2E',
  description: 'Día para el e2e de zonas táctiles',
  days: [{
    name: 'Día Toque E2E',
    exercises: [[TIME_EXERCISE, null], [WEIGHT_EXERCISE, null], ['E2E Toque Uno', 1], ['E2E Toque Dos', 1]],
  }],
}
const DAY_NAME = ROUTINE.days[0].name
const SECOND_GYM = 'Gimnasio Toque E2E'
// Stored values of `BODY_MEASUREMENT_TYPES`: two, so that the type selector has a list to open.
const MEASUREMENT_TYPES = ['cintura', 'pecho']

// A phone, by touch: the size the 44px rule is about.
test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
// The tests start sessions of the same user: in parallel they would abandon each other's.
test.describe.configure({ mode: 'serial' })

/** Supabase client signed in as this spec's user, from Node. */
async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  expect(error).toBeNull()
  return { supabase, userId: data.user.id }
}

/** The time exercise, created before the routine so that `seedRoutine` finds it instead of making a weight one. */
async function ensureTimeExercise(supabase, userId) {
  const { data: found } = await supabase
    .from('exercises').select('id').eq('user_id', userId).eq('name_es', TIME_EXERCISE).is('deleted_at', null).limit(1)
  if (found?.length) return
  const { data: muscleGroups } = await supabase.from('muscle_groups').select('id').limit(1)
  const { error } = await supabase
    .from('exercises')
    .insert({ name_es: TIME_EXERCISE, tracked_fields: ['time'], muscle_group_id: muscleGroups[0].id, user_id: userId })
  if (error) throw error
}

/** Two gyms: with one, neither the session's gym chip nor "Compare" in the history exist. */
async function ensureTwoGyms(supabase, userId) {
  const { data: gyms, error } = await supabase.from('gyms').select('id, is_default')
  if (error) throw error
  const missing = []
  if (!gyms.some(gym => gym.is_default)) missing.push({ user_id: userId, name: null, is_default: true })
  if (!gyms.some(gym => !gym.is_default)) missing.push({ user_id: userId, name: SECOND_GYM, is_default: false })
  if (missing.length === 0) return
  const { error: insertError } = await supabase.from('gyms').insert(missing)
  if (insertError) throw insertError
}

/** Removes every session of the user: a previous test, a failed attempt or this one. */
async function deleteSessions(supabase, userId) {
  const { error } = await supabase.from('workout_sessions').delete().eq('user_id', userId)
  if (error) throw error
}

async function prepare() {
  const { supabase, userId } = await signedInClient()
  await ensureTimeExercise(supabase, userId)
  await seedRoutine(supabase, userId, ROUTINE)
  await ensureTwoGyms(supabase, userId)
  await deleteSessions(supabase, userId)
}

/** Exactly one weight record, and two measurement types enabled: what shows every control of body metrics. */
async function prepareBodyMetrics(supabase, userId) {
  const { error: deleteError } = await supabase.from('body_weight_records').delete().eq('user_id', userId)
  if (deleteError) throw deleteError
  const { error: insertError } = await supabase.from('body_weight_records').insert({ user_id: userId, weight: 80 })
  if (insertError) throw insertError
  const { error: preferenceError } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, key: 'enabled_body_measurements', value: MEASUREMENT_TYPES }, { onConflict: 'user_id,key' })
  if (preferenceError) throw preferenceError
}

async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

async function openRoutine(page) {
  await page.goto('/routines')
  await page.getByText(ROUTINE.name, { exact: true }).first().click()
  await expect(page).toHaveURL(/\/routine\/\d+$/)
}

function startDayButton(page) {
  return page.getByRole('button', { name: `Empezar ${DAY_NAME}` })
}

async function startSession(page) {
  await openRoutine(page)
  await page.getByRole('heading', { name: DAY_NAME }).click()
  await startDayButton(page).click()
  await expect(page).toHaveURL(/\/workout/, { timeout: 10000 })
  // The first card opens on its own a moment after the list shows: a tap on another card before
  // that would be undone by it. Its three set rows are the sign it has opened.
  await expect(page.locator('main input')).toHaveCount(3, { timeout: 10000 })
}

/** The open modal's box (child of the full-screen overlay) that holds `content`. */
function modal(page, content) {
  return page.locator('div.fixed.inset-0 > div').filter({ has: content })
}

/** Taps the overlay, outside the modal box. */
async function tapOutside(page) {
  await page.mouse.click(5, 5)
}

/** Types a time in the first set of the time exercise (expanded): that is what shows the execution timer. */
async function typeFirstSetTime(page) {
  await page.locator('main input').first().fill('30')
}

async function completeFirstSet(page) {
  await page.getByRole('button', { name: 'Completar serie' }).first().click()
}

/** Opens the weight exercise (which folds the time one) and completes its first set at `weight` × 10. */
async function completeWeightSet(page, weight) {
  await page.locator('main').getByRole('heading', { level: 4, name: WEIGHT_EXERCISE }).click()
  const inputs = page.locator('main input')
  await expect(inputs).toHaveCount(6)
  await inputs.nth(0).fill(weight)
  await inputs.nth(1).fill('10')
  await completeFirstSet(page)
  await page.getByRole('button', { name: 'Saltar descanso' }).click()
}

function endSessionModal(page) {
  return modal(page, page.getByRole('heading', { name: 'Finalizar entrenamiento' }))
}

/** A whole session through the app: one set of the weight exercise at `weight` × 10, then ended. */
async function finishSession(page, weight) {
  await startSession(page)
  await completeWeightSet(page, weight)
  await page.getByRole('button', { name: 'Terminar entrenamiento' }).click()
  await endSessionModal(page).getByRole('button', { name: 'Hecho' }).click()
  await expect(page).toHaveURL(/\/workout\/summary/, { timeout: 10000 })
}

test.afterEach(async () => {
  const { supabase, userId } = await signedInClient()
  await deleteSessions(supabase, userId)
})

test.describe('Touch targets: 44px tap controls at a phone size', () => {
  test('routine detail', async ({ page }) => {
    await prepare()
    await login(page)
    await openRoutine(page)
    await expect(startDayButton(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Volver' })).toBeVisible()

    await expectTouchTargets(page.locator('body'))
  })

  test('active session, its timers and the sheets opened from it', async ({ page }) => {
    await prepare()
    await login(page)
    await startSession(page)
    const body = page.locator('body')

    // State 2: first exercise expanded, with the gym chip, the superset header and the timer start.
    await typeFirstSetTime(page)
    await expect(page.getByRole('button', { name: /^Iniciar / })).toBeVisible()
    await expect(page.getByTitle('Cambiar gimnasio de la sesión')).toBeVisible()
    await expect(page.getByRole('button', { name: /Superset A/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Añadir serie' }).first()).toBeVisible()
    await expectTouchTargets(body)

    // State 3: the execution timer running.
    await page.getByRole('button', { name: /^Iniciar / }).click()
    await expect(page.getByRole('button', { name: 'Parar' })).toBeVisible()
    await expectTouchTargets(body)
    await page.getByRole('button', { name: 'Parar' }).click()

    // State 4: the rest timer full screen, then minimized.
    await completeFirstSet(page)
    const restOverlay = page.locator('div.fixed.inset-0.z-50')
    await expect(restOverlay.getByRole('button', { name: 'Saltar descanso' })).toBeVisible()
    await expectTouchTargets(restOverlay)
    await restOverlay.getByRole('button', { name: 'Minimizar' }).click()
    const restPill = page.locator('div.fixed.select-none')
    await expect(restPill.getByRole('button')).toBeVisible()
    await expectTouchTargets(restPill)
    await restPill.getByRole('button').click()
    await restOverlay.getByRole('button', { name: 'Saltar descanso' }).click()
    await expect(restOverlay).toBeHidden()

    // State 5: the set details sheet, opened from the effort chip of the second set.
    await page.locator('main').getByRole('button', { name: 'Esfuerzo' }).nth(1).click()
    const setSheet = modal(page, page.getByText(/DETALLES/))
    await expect(setSheet.getByRole('button', { name: 'Cerrar' })).toBeVisible()
    await expectTouchTargets(setSheet)
    await setSheet.getByRole('button', { name: 'Cerrar' }).click()
    await expect(setSheet).toBeHidden()

    // State 6: the exercise history, from the card's "···" menu.
    const cardMenu = page.locator('main').getByRole('button', { name: 'Más opciones' }).first()
    await cardMenu.click()
    await page.getByRole('button', { name: 'Histórico' }).click()
    const historyModal = modal(page, page.getByRole('button', { name: 'Comparar' }))
    await expect(historyModal.getByRole('button', { name: 'Rutina', exact: true })).toBeVisible()
    await expectTouchTargets(historyModal)
    await tapOutside(page)
    await expect(historyModal).toBeHidden()

    // State 7: the edit session exercise modal, from the same menu.
    await cardMenu.click()
    await page.getByRole('button', { name: 'Editar' }).click()
    const editModal = modal(page, page.getByRole('button', { name: 'Ficha' }))
    await expect(editModal.getByRole('combobox').first()).toBeVisible()
    await expectTouchTargets(editModal)
    await editModal.getByRole('button', { name: 'Cancelar' }).click()
    await expect(editModal).toBeHidden()
  })

  test('end session modal and workout summary', async ({ page }) => {
    await prepare()
    await login(page)
    // A first session at 40 kg: a rep record needs history to beat.
    await finishSession(page, '40')

    // The second, at 50 kg, ends with a record: the summary has two cards, with arrows and dots.
    await startSession(page)
    await completeWeightSet(page, '50')

    // State 8: the end session modal, then the summary.
    await page.getByRole('button', { name: 'Terminar entrenamiento' }).click()
    const endModal = endSessionModal(page)
    await expect(endModal.getByRole('button', { name: 'Hecho' })).toBeVisible()
    await expectTouchTargets(endModal)
    await endModal.getByRole('button', { name: 'Hecho' }).click()

    await expect(page).toHaveURL(/\/workout\/summary/, { timeout: 10000 })
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeVisible()
    await expectTouchTargets(page.locator('body'))
  })

  test('history: a session, its edit mode, two sessions in a day and the exercise chart', async ({ page }) => {
    await prepare()
    await login(page)
    await finishSession(page, '40')
    await page.goto('/history')
    const body = page.locator('body')

    // History state 1: today selected (the page does it on its own) and its session open, with the
    // calendar, the gym chip, the session's "···" and the sets by muscle group.
    await expect(page.getByRole('button', { name: 'Mes anterior' })).toBeVisible()
    await expect(page.getByTitle('Cambiar gimnasio de la sesión')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Series por grupo muscular' })).toBeVisible()
    await expectTouchTargets(body)

    // History state 2: the same session in edit mode.
    await page.getByRole('button', { name: 'Más opciones' }).click()
    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Añadir serie' })).toBeVisible()
    await expectTouchTargets(body)
    await page.getByRole('button', { name: 'Hecho', exact: true }).click()

    // History state 3: a second session the same day, so the day shows a chip per session.
    await finishSession(page, '50')
    await page.goto('/history')
    const sessionChips = page.getByRole('button', { name: new RegExp(`^${DAY_NAME} · `) })
    await expect(sessionChips).toHaveCount(2)
    await expectTouchTargets(body)

    // History state 4: the weight exercise's history, from its card. Two sessions draw its chart,
    // with the metric tabs and the range toggle.
    await page.getByRole('heading', { level: 3, name: WEIGHT_EXERCISE }).click()
    const historyModal = modal(page, page.getByRole('button', { name: '1M', exact: true }))
    await expect(historyModal.getByRole('button', { name: 'Volumen total' })).toBeVisible()
    await expectTouchTargets(historyModal)
  })

  test('body metrics: weight, measurements, the type selector and the config modal', async ({ page }) => {
    const { supabase, userId } = await signedInClient()
    await prepareBodyMetrics(supabase, userId)
    await login(page)
    await page.goto('/body-metrics')
    const body = page.locator('body')

    // The weight tab, with the record's edit and delete side by side.
    await expect(page.getByRole('button', { name: 'Editar peso' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Registrar peso' })).toBeVisible()
    await expectTouchTargets(body)

    // The measurements tab, then its type selector open.
    await page.getByRole('button', { name: 'Medidas Corporales' }).click()
    await expect(page.getByRole('button', { name: 'Configurar medidas' })).toBeVisible()
    await expectTouchTargets(body)
    await page.getByRole('button', { name: 'Cintura', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pecho', exact: true })).toBeVisible()
    await expectTouchTargets(body)
    await page.getByRole('button', { name: 'Pecho', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Cintura', exact: true })).toBeHidden()

    // The config modal, from the settings button.
    await page.getByRole('button', { name: 'Configurar medidas' }).click()
    const configModal = modal(page, page.getByRole('heading', { name: 'Configurar medidas' }))
    await expect(configModal.getByRole('button', { name: 'Cerrar' })).toBeVisible()
    await expectTouchTargets(configModal)
  })

  test('gyms', async ({ page }) => {
    await prepare()
    await login(page)
    await page.goto('/gyms')
    await expect(page.getByText(SECOND_GYM)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Renombrar gimnasio' })).toHaveCount(2)
    await expectTouchTargets(page.locator('body'))
  })
})
