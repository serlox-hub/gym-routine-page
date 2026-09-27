import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'
import { seedRoutine } from './supersetRoutines.js'

// Drag to reorder, join and leave supersets in the active session (issue #95). Runs on its OWN
// user (`supabase/seed.sql`): only one session can be in progress per user (migration 058), and
// with the shared user it would race `session.spec.js`/`completeSet.spec.js` under `fullyParallel`.
const EMAIL = process.env.E2E_SESSION_TEST_EMAIL
const PASSWORD = process.env.E2E_SESSION_TEST_PASSWORD
if (!EMAIL || !PASSWORD) {
  throw new Error('Faltan E2E_SESSION_TEST_EMAIL y E2E_SESSION_TEST_PASSWORD en apps/web/.env.local (ver .env.example).')
}

// Uno · (Dos + Tres) · Cuatro · Cinco. The session copies it when it starts.
const ROUTINE = {
  name: 'Rutina Sesión E2E',
  description: 'Día con superserie para los e2e de arrastre en la sesión',
  days: [{
    name: 'Día Sesión E2E',
    exercises: [['E2E Uno', null], ['E2E Dos', 1], ['E2E Tres', 1], ['E2E Cuatro', null], ['E2E Cinco', null]],
  }],
}
const DAY_NAME = ROUTINE.days[0].name
const INITIAL_ORDER = ROUTINE.days[0].exercises.map(([name]) => name)

// Its own login in each test, not the shared `.auth/user.json` of the other user.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 1000 } })
// Every test starts a session of the same user: in parallel they would abandon each other's.
test.describe.configure({ mode: 'serial' })

/** Supabase client signed in as this spec's user, from Node. It does not sign out (see reorderExercises.spec.js). */
async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  expect(error).toBeNull()
  return { supabase, userId: data.user.id }
}

/** The routine's rows as the DB has them: the session must never change them. */
async function routineRows(supabase) {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select('id, sort_order, superset_group, routine_days!inner(name)')
    .eq('routine_days.name', DAY_NAME)
    .order('id')
  if (error) throw error
  return data.map(({ id, sort_order, superset_group }) => ({ id, sort_order, superset_group }))
}

/** Seeds the routine (once) and removes any session left by a previous test or a failed attempt. */
async function prepare() {
  const { supabase, userId } = await signedInClient()
  await seedRoutine(supabase, userId, ROUTINE)
  const { error } = await supabase.from('workout_sessions').delete().eq('user_id', userId)
  if (error) throw error
  return supabase
}

async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

async function startSession(page) {
  await page.goto('/routines')
  await page.getByText(ROUTINE.name, { exact: true }).first().click()
  await expect(page).toHaveURL(/\/routine\/\d+$/)
  await page.getByRole('heading', { name: DAY_NAME }).click()
  // The day card's play button has no text: it is found by its icon.
  await page.locator('button:has(svg.lucide-play)').first().click()
  await expect(page).toHaveURL(/\/workout/, { timeout: 10000 })
  await expect(exerciseNames(page)).toHaveText(INITIAL_ORDER, { timeout: 10000 })
}

function exerciseNames(page) {
  return page.locator('main section').filter({ hasText: 'Principal' }).locator('h4')
}

/** The card header of `name` (name, pills, handle and menu). */
function exerciseHeader(page, name) {
  return page.locator('div.items-start.gap-3').filter({ has: page.getByRole('heading', { level: 4, name, exact: true }) })
}

/** The handle goes before the name: the header's first button. */
function exerciseHandle(page, name) {
  return exerciseHeader(page, name).locator('button').first()
}

/** The purple header's handle, sibling of its label. */
function supersetHandle(page) {
  return page.getByText('Superset A', { exact: true }).locator('xpath=..').locator('button')
}

/** Y just below the card of individual `name` (its header's parent): dropping there lands after it. */
async function belowCard(page, name) {
  const box = await exerciseHeader(page, name).locator('xpath=..').boundingBox()
  return box.y + box.height
}

function supersetHeaders(page) {
  return page.getByText('Superset A', { exact: true })
}

/**
 * Arrastra el asa en varios pasos hasta la Y que da `getTargetY`: dnd-kit pide recorrido para
 * activar el gesto y recalcula la colisión en cada movimiento. El destino se mide YA activado:
 * arrastrar una cabecera pliega sus miembros y todo lo de debajo sube.
 */
async function dragHandleTo(page, handle, getTargetY) {
  const box = await handle.boundingBox()
  const x = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await page.mouse.move(x, startY)
  await page.mouse.down()
  await page.mouse.move(x, startY + ACTIVATION_STEP)
  await page.waitForTimeout(50)
  const targetY = await getTargetY()
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, startY + ((targetY - startY) * i) / steps)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

// More than dnd-kit's activation distance (`design.gestureActivationDistance`).
const ACTIVATION_STEP = 10

async function rowCenter(page, name) {
  const box = await exerciseHeader(page, name).boundingBox()
  return box.y + box.height / 2
}

test.describe('Session: drag to reorder, join and leave supersets', () => {
  test('an individual dropped between two members joins, a member dropped between individuals leaves, and the routine does not change', async ({ page }) => {
    const supabase = await prepare()
    const routineBefore = await routineRows(supabase)
    await login(page)
    await startSession(page)
    await expect(supersetHeaders(page)).toHaveCount(1)

    // Cuatro onto Tres's slot (between Dos and Tres): it joins. ONE header is the proof: had it
    // stayed individual between two members, the superset would render as two cards.
    await dragHandleTo(page, exerciseHandle(page, 'E2E Cuatro'), () => rowCenter(page, 'E2E Tres'))
    const joined = ['E2E Uno', 'E2E Dos', 'E2E Cuatro', 'E2E Tres', 'E2E Cinco']
    await expect(exerciseNames(page)).toHaveText(joined)
    await expect(supersetHeaders(page)).toHaveCount(1)
    await expect(page.getByText('(3 ejercicios)')).toBeVisible()

    await page.reload()
    await expect(exerciseNames(page)).toHaveText(joined, { timeout: 10000 })
    await expect(supersetHeaders(page)).toHaveCount(1)

    // Dos (a member) onto Cinco's slot, below the footer: it leaves.
    await dragHandleTo(page, exerciseHandle(page, 'E2E Dos'), () => rowCenter(page, 'E2E Cinco'))
    const left = ['E2E Uno', 'E2E Cuatro', 'E2E Tres', 'E2E Cinco', 'E2E Dos']
    await expect(exerciseNames(page)).toHaveText(left)
    await expect(supersetHeaders(page)).toHaveCount(1)
    await expect(page.getByText('(2 ejercicios)')).toBeVisible()

    await page.reload()
    await expect(exerciseNames(page)).toHaveText(left, { timeout: 10000 })

    // Session only: the routine keeps its order and membership.
    expect(await routineRows(supabase)).toEqual(routineBefore)
  })

  test('the header moves the whole superset, and an individual dropped on the last member joins at the end', async ({ page }) => {
    await prepare()
    await login(page)
    await startSession(page)
    // Uno starts expanded; collapsed, its card is as tall as the others and the drop targets below
    // are easy to aim at. The drag itself does not depend on it.
    await exerciseHeader(page, 'E2E Uno').click()

    // Criterion 1: the header drags the whole run past Cuatro, still one card.
    await dragHandleTo(page, supersetHandle(page), () => belowCard(page, 'E2E Cuatro'))
    const moved = ['E2E Uno', 'E2E Cuatro', 'E2E Dos', 'E2E Tres', 'E2E Cinco']
    await expect(exerciseNames(page)).toHaveText(moved)
    await expect(supersetHeaders(page)).toHaveCount(1)

    await page.reload()
    await expect(exerciseNames(page)).toHaveText(moved, { timeout: 10000 })

    // Criterion 2: Uno onto Tres, the last member, lands right above the footer and joins last.
    await dragHandleTo(page, exerciseHandle(page, 'E2E Uno'), () => rowCenter(page, 'E2E Tres'))
    const joinedAtEnd = ['E2E Cuatro', 'E2E Dos', 'E2E Tres', 'E2E Uno', 'E2E Cinco']
    await expect(exerciseNames(page)).toHaveText(joinedAtEnd)
    await expect(supersetHeaders(page)).toHaveCount(1)
    await expect(page.getByText('(3 ejercicios)')).toBeVisible()

    await page.reload()
    await expect(exerciseNames(page)).toHaveText(joinedAtEnd, { timeout: 10000 })
    await expect(page.getByText('(3 ejercicios)')).toBeVisible()
  })
})

// The RPC's `ELSE se.superset_group` is what stops every reorder from nulling every superset of
// the session: tested against the real database, not a mock.
test.describe('RPC reorder_session_exercises', () => {
  test('keeps membership without the key, clears it with null and rejects two sessions', async () => {
    const supabase = await prepare()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: exercises } = await supabase.from('exercises').select('id, name_es').eq('user_id', user.id).in('name_es', ['E2E Uno', 'E2E Dos', 'E2E Tres'])
    const exerciseId = Object.fromEntries(exercises.map(e => [e.name_es, e.id]))

    // Two finished sessions written directly: the RPC under test is the only thing exercised.
    const createSession = async (rows) => {
      const { data: session, error } = await supabase
        .from('workout_sessions')
        .insert({ user_id: user.id, status: 'completed', completed_at: new Date().toISOString() })
        .select('id')
        .single()
      if (error) throw error
      const { data, error: rowsError } = await supabase
        .from('session_exercises')
        .insert(rows.map(([name, group], index) => ({
          session_id: session.id, exercise_id: exerciseId[name], sort_order: index + 1,
          series: 3, reps: '10', rest_seconds: 90, superset_group: group, is_extra: false, is_warmup: false,
        })))
        .select('id, exercise:exercises(name_es)')
      if (rowsError) throw rowsError
      return { id: session.id, rows: Object.fromEntries(data.map(row => [row.exercise.name_es, row.id])) }
    }
    const a = await createSession([['E2E Uno', null], ['E2E Dos', 1], ['E2E Tres', 1]])
    const b = await createSession([['E2E Uno', null]])

    const rowsOf = async (sessionId) => {
      const { data } = await supabase.from('session_exercises').select('id, superset_group').eq('session_id', sessionId).order('sort_order')
      return data
    }
    const reorder = (exerciseOrders) => supabase.rpc('reorder_session_exercises', { exercise_orders: exerciseOrders })
    const { 'E2E Uno': uno, 'E2E Dos': dos, 'E2E Tres': tres } = a.rows

    // Order only: nobody loses their superset.
    expect((await reorder([{ id: dos, sort_order: 1 }, { id: tres, sort_order: 2 }, { id: uno, sort_order: 3 }])).error).toBeNull()
    expect(await rowsOf(a.id)).toEqual([
      { id: dos, superset_group: 1 },
      { id: tres, superset_group: 1 },
      { id: uno, superset_group: null },
    ])

    // An explicit null takes exactly that row out.
    expect((await reorder([{ id: dos, sort_order: 1 }, { id: tres, sort_order: 2, superset_group: null }, { id: uno, sort_order: 3 }])).error).toBeNull()
    expect(await rowsOf(a.id)).toEqual([
      { id: dos, superset_group: 1 },
      { id: tres, superset_group: null },
      { id: uno, superset_group: null },
    ])

    // Two sessions in one payload: rejected, and nothing is written.
    const crossSession = await reorder([
      { id: uno, sort_order: 1, superset_group: 1 },
      { id: b.rows['E2E Uno'], sort_order: 2, superset_group: 1 },
    ])
    expect(crossSession.error).not.toBeNull()
    expect(await rowsOf(a.id)).toEqual([
      { id: dos, superset_group: 1 },
      { id: tres, superset_group: null },
      { id: uno, superset_group: null },
    ])
  })
})
