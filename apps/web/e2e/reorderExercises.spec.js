import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'
import { findSeededRoutine, restoreSeededRoutine } from './supersetRoutines.js'

// Arrastre para reordenar ejercicios de un día (issue #88), sobre el día sembrado por
// `testData.setup.js` con una superserie: E2E Uno · (E2E Dos + E2E Tres) · E2E Cuatro.
const ROUTINE_NAME = 'Rutina Superset E2E'
const DAY_NAME = 'Día Superset E2E'
const INITIAL_ORDER = ['E2E Uno', 'E2E Dos', 'E2E Tres', 'E2E Cuatro']

// Join and leave a superset by dragging (issue #89), on its own seeded routine so it does not
// collide with the test above: E2E Uno · (E2E Dos + E2E Tres) · E2E Cuatro · E2E Cinco.
const MEMBERSHIP_ROUTINE_NAME = 'Rutina Pertenencia E2E'
const MEMBERSHIP_DAY_NAME = 'Día Pertenencia E2E'

// The bare RPC (issue #89): Día RPC A = E2E Uno · (E2E Dos + E2E Tres); Día RPC B = E2E Cuatro.
const RPC_ROUTINE_NAME = 'Rutina RPC E2E'

/**
 * Supabase client signed in as the e2e user, from Node. It does not sign out: by default that
 * revokes EVERY session of the user, the browser's one included.
 */
async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_TEST_EMAIL,
    password: process.env.E2E_TEST_PASSWORD,
  })
  expect(error).toBeNull()
  return supabase
}

/** Every test starts from the seeded state, so a CI retry does not start from a failed attempt's. */
async function restore(routineName) {
  await restoreSeededRoutine(await signedInClient(), routineName)
}

function block(page) {
  return page.locator('section').filter({ hasText: 'Principal' })
}

/** Nombres de los ejercicios del bloque, en el orden en el que se pintan. */
function exerciseNames(page) {
  return block(page).locator('h4')
}

function exerciseRow(page, name) {
  return page.locator('div.cursor-pointer').filter({ has: page.getByRole('heading', { level: 4, name }) })
}

/** El asa es el único botón de la fila. */
function exerciseHandle(page, name) {
  return exerciseRow(page, name).locator('button')
}

/** El asa de la cabecera morada, hermana de su etiqueta. */
function supersetHandle(page) {
  return page.getByText('Superset A').locator('xpath=..').locator('button')
}

async function openDay(page, routineName = ROUTINE_NAME, dayName = DAY_NAME) {
  await page.goto('/routines')
  const card = page.getByText(routineName, { exact: true }).first()
  await expect(card).toBeVisible({ timeout: 10000 })
  await card.click()
  await expect(page).toHaveURL(/\/routine\/\d+$/)
  await expandDay(page, dayName)
}

async function expandDay(page, dayName = DAY_NAME) {
  await page.getByRole('heading', { name: dayName }).click()
  await expect(exerciseNames(page).first()).toBeVisible({ timeout: 10000 })
}

/**
 * Arrastra el asa hasta `targetY` en varios pasos: dnd-kit pide recorrido para activar el gesto y
 * recalcula la colisión en cada movimiento, así que un salto único no reordenaría nada.
 */
async function dragHandleTo(page, handle, targetY) {
  const box = await handle.boundingBox()
  const x = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await page.mouse.move(x, startY)
  await page.mouse.down()
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, startY + ((targetY - startY) * i) / steps)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

/** Y por debajo del centro de la fila `name`: soltar ahí la deja por detrás. */
async function belowRow(page, name) {
  const box = await exerciseRow(page, name).boundingBox()
  return box.y + box.height
}

/** Y of the center of row `name`: dropping there takes its position. */
async function rowCenter(page, name) {
  const box = await exerciseRow(page, name).boundingBox()
  return box.y + box.height / 2
}

test.describe('Reordenar ejercicios por arrastre', () => {
  test.beforeEach(() => restore(ROUTINE_NAME))

  test('arrastra un ejercicio y una superserie completa, y el orden persiste', async ({ page }) => {
    await openDay(page)
    await expect(exerciseNames(page)).toHaveText(INITIAL_ORDER)
    await expect(page.getByText('Superset A')).toHaveCount(1)

    // Criterio 1: un individual hasta el final del bloque, por su propia asa.
    await dragHandleTo(page, exerciseHandle(page, 'E2E Uno'), await belowRow(page, 'E2E Cuatro'))
    const afterFirstDrag = ['E2E Dos', 'E2E Tres', 'E2E Cuatro', 'E2E Uno']
    await expect(exerciseNames(page)).toHaveText(afterFirstDrag)

    await page.reload()
    await expandDay(page)
    await expect(exerciseNames(page)).toHaveText(afterFirstDrag)

    // Criterio 2: la superserie entera desde el asa de su cabecera. Sus miembros se pliegan
    // mientras viaja, y al soltarla sigue siendo UNA sola tarjeta morada.
    await dragHandleTo(page, supersetHandle(page), await belowRow(page, 'E2E Uno'))
    const afterSecondDrag = ['E2E Cuatro', 'E2E Uno', 'E2E Dos', 'E2E Tres']
    await expect(exerciseNames(page)).toHaveText(afterSecondDrag)
    await expect(page.getByText('Superset A')).toHaveCount(1)

    await page.reload()
    await expandDay(page)
    await expect(exerciseNames(page)).toHaveText(afterSecondDrag)
    await expect(page.getByText('Superset A')).toHaveCount(1)
  })
})

test.describe('Join and leave a superset by drag', () => {
  // Tall enough that no drop target sits in dnd-kit's auto-scroll band at the bottom edge: a scroll
  // mid-drag moves the landing slot by one row, and here one row is the difference between leaving
  // the superset and landing somewhere else.
  test.use({ viewport: { width: 1280, height: 1000 } })
  // Every test here edits the same seeded routine: in parallel (`fullyParallel`, the local default)
  // one test's drag lands in the other's list.
  test.describe.configure({ mode: 'serial' })
  test.beforeEach(() => restore(MEMBERSHIP_ROUTINE_NAME))

  test('an individual dropped between two members joins, and a member dropped between individuals leaves', async ({ page }) => {
    await openDay(page, MEMBERSHIP_ROUTINE_NAME, MEMBERSHIP_DAY_NAME)
    await expect(exerciseNames(page)).toHaveText(['E2E Uno', 'E2E Dos', 'E2E Tres', 'E2E Cuatro', 'E2E Cinco'])

    // Criterion 1: Uno lands on Dos's slot (between Dos and Tres) and joins. Still having ONE header
    // is the proof: had Uno stayed individual between two members, the superset would render split
    // into two cards with the same label.
    await dragHandleTo(page, exerciseHandle(page, 'E2E Uno'), await rowCenter(page, 'E2E Dos'))
    const joined = ['E2E Dos', 'E2E Uno', 'E2E Tres', 'E2E Cuatro', 'E2E Cinco']
    await expect(exerciseNames(page)).toHaveText(joined)
    await expect(page.getByText('Superset A')).toHaveCount(1)

    await page.reload()
    await expandDay(page, MEMBERSHIP_DAY_NAME)
    await expect(exerciseNames(page)).toHaveText(joined)
    await expect(page.getByText('Superset A')).toHaveCount(1)

    // Criterion 2: Dos (a member) lands on Cuatro's slot (between Cuatro and Cinco) and leaves. With
    // Dos still in the group, it would be a second "Superset A" card there.
    await dragHandleTo(page, exerciseHandle(page, 'E2E Dos'), await rowCenter(page, 'E2E Cuatro'))
    const left = ['E2E Uno', 'E2E Tres', 'E2E Cuatro', 'E2E Dos', 'E2E Cinco']
    await expect(exerciseNames(page)).toHaveText(left)
    await expect(page.getByText('Superset A')).toHaveCount(1)

    await page.reload()
    await expandDay(page, MEMBERSHIP_DAY_NAME)
    await expect(exerciseNames(page)).toHaveText(left)
    await expect(page.getByText('Superset A')).toHaveCount(1)
  })

  test('dropped on the last member it joins at the end, and the last member dragged past the footer leaves', async ({ page }) => {
    const supabase = await signedInClient()
    const { rows } = (await findSeededRoutine(supabase, MEMBERSHIP_ROUTINE_NAME))[MEMBERSHIP_DAY_NAME]
    const groupOf = async (rowId) => {
      const { data } = await supabase.from('routine_exercises').select('superset_group').eq('id', rowId).single()
      return data.superset_group
    }

    await openDay(page, MEMBERSHIP_ROUTINE_NAME, MEMBERSHIP_DAY_NAME)

    // Uno onto Tres, the last member: it lands right above the footer, last in the superset.
    await dragHandleTo(page, exerciseHandle(page, 'E2E Uno'), await rowCenter(page, 'E2E Tres'))
    const joinedAtEnd = ['E2E Dos', 'E2E Tres', 'E2E Uno', 'E2E Cuatro', 'E2E Cinco']
    await expect(exerciseNames(page)).toHaveText(joinedAtEnd)
    await expect.poll(() => groupOf(rows['E2E Uno'])).toBe(1)

    // Uno, now the last member, moved just past the footer (a vertical move only): same order, out
    // of the superset. The footer is the only thing between it and Cuatro.
    const handleBox = await exerciseHandle(page, 'E2E Uno').boundingBox()
    const unoBox = await exerciseRow(page, 'E2E Uno').boundingBox()
    const handleY = handleBox.y + handleBox.height / 2
    await dragHandleTo(page, exerciseHandle(page, 'E2E Uno'), handleY + (unoBox.y + unoBox.height + 5) - (unoBox.y + unoBox.height / 2))
    await expect.poll(() => groupOf(rows['E2E Uno'])).toBeNull()
    await expect(exerciseNames(page)).toHaveText(joinedAtEnd)
    await expect(page.getByText('Superset A')).toHaveCount(1)
  })
})

// The RPC's `ELSE re.superset_group` is what stops every reorder from nulling every superset in the
// database: it is tested against the real database, not a mock.
test.describe('RPC reorder_routine_exercises', () => {
  test('keeps membership without the key, clears it with null and rejects two days', async () => {
    const supabase = await signedInClient()
    await restoreSeededRoutine(supabase, RPC_ROUTINE_NAME)

    const days = await findSeededRoutine(supabase, RPC_ROUTINE_NAME)
    const dayA = days['Día RPC A'].id
    const dayB = days['Día RPC B'].id

    const rowsOf = async (dayId) => {
      const { data } = await supabase
        .from('routine_exercises')
        .select('id, superset_group')
        .eq('routine_day_id', dayId)
        .order('sort_order')
      return data
    }
    const reorder = (exerciseOrders) => supabase.rpc('reorder_routine_exercises', { exercise_orders: exerciseOrders })

    // Row ids by name: after a retry, the order by `sort_order` would no longer say which is which.
    const { 'E2E Uno': uno, 'E2E Dos': dos, 'E2E Tres': tres } = days['Día RPC A'].rows
    const { 'E2E Cuatro': cuatro } = days['Día RPC B'].rows

    // Order only: nobody loses their superset.
    expect((await reorder([
      { id: dos, sort_order: 1 },
      { id: tres, sort_order: 2 },
      { id: uno, sort_order: 3 },
    ])).error).toBeNull()
    expect(await rowsOf(dayA)).toEqual([
      { id: dos, superset_group: 1 },
      { id: tres, superset_group: 1 },
      { id: uno, superset_group: null },
    ])

    // An explicit null takes exactly that row out.
    expect((await reorder([
      { id: dos, sort_order: 1 },
      { id: tres, sort_order: 2, superset_group: null },
      { id: uno, sort_order: 3 },
    ])).error).toBeNull()
    expect(await rowsOf(dayA)).toEqual([
      { id: dos, superset_group: 1 },
      { id: tres, superset_group: null },
      { id: uno, superset_group: null },
    ])

    // Two days in one payload: rejected, and nothing is written.
    const crossDay = await reorder([
      { id: uno, sort_order: 1, superset_group: 1 },
      { id: cuatro, sort_order: 2, superset_group: 1 },
    ])
    expect(crossDay.error).not.toBeNull()
    expect(await rowsOf(dayB)).toEqual([{ id: cuatro, superset_group: null }])
  })
})
