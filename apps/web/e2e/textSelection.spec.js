import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'

// Text selection (issue #215): on a touch screen a long press selects no read-only text, while
// editable fields and what opts in with `select-text`/`select-all` stay selectable; with a mouse
// everything selects as before. The rule is in `src/index.css`, scoped with `(pointer: coarse)`.
// The iOS callout (`-webkit-touch-callout`) is not checked: Chromium does not implement it.
//
// Runs on the shared e2e user, on a routine of its own that is deleted at the end.

const ROUTINE_NAME = `Text Selection E2E ${Date.now()}`
const DAY_NAME = 'Text Selection Day'
const STREAK_WEEKDAY = '[data-testid=streak-card] .recharts-cartesian-axis-tick-label text'

async function signedInClient() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_TEST_EMAIL,
    password: process.env.E2E_TEST_PASSWORD,
  })
  expect(error).toBeNull()
  return supabase
}

/** The element's computed `user-select`, read prefixed where the engine only has that one. */
function userSelect(locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element)
    return style.userSelect || style.webkitUserSelect
  })
}

function isCoarsePointer(page) {
  return page.evaluate(() => matchMedia('(pointer: coarse)').matches)
}

/** The home's greeting: read-only text outside the streak card's swipe area (see below). */
function greeting(page) {
  return page.getByRole('heading', { level: 1 })
}

test.describe('on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  let supabase
  let routineId

  test.beforeAll(async () => {
    supabase = await signedInClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: routine, error } = await supabase
      .from('routines').insert({ name: ROUTINE_NAME, user_id: user.id }).select().single()
    if (error) throw error
    routineId = routine.id
    const { error: dayError } = await supabase
      .from('routine_days').insert({ routine_id: routineId, name: DAY_NAME, sort_order: 1 })
    if (dayError) throw dayError
  })

  test.afterAll(async () => {
    await supabase.from('routines').delete().eq('id', routineId)
  })

  // Every assertion below is only about a touch screen if the browser reports one.
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    expect(await isCoarsePointer(page)).toBe(true)
  })

  test('read-only text is not selectable', async ({ page }) => {
    const weekday = page.locator(STREAK_WEEKDAY).first()
    await expect(weekday).toBeVisible()
    expect(await userSelect(weekday)).toBe('none')
    // The weekdays sit in the streak card's swipe area, which turns selection off inline for mouse
    // drags: they would pass without the global rule. The greeting is outside that area.
    await expect(greeting(page)).toBeVisible()
    expect(await userSelect(greeting(page))).toBe('none')
  })

  test('a text field stays selectable and takes typing', async ({ page }) => {
    await page.goto(`/routine/${routineId}`)
    await page.getByRole('heading', { name: DAY_NAME }).tap()
    await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).tap()
    const search = page.getByPlaceholder('Buscar ejercicio...')
    await expect(search).toBeVisible()
    expect(await userSelect(search)).toBe('text')

    await search.tap()
    await search.pressSequentially('press')
    await expect(search).toHaveValue('press')
  })

  test('the share link box stays selectable', async ({ page }) => {
    await page.goto(`/routine/${routineId}`)
    await page.locator('header button:has(svg.lucide-ellipsis-vertical)').tap()
    await page.getByRole('button', { name: 'Crear enlace para compartir' }).tap()
    await page.getByRole('button', { name: 'Crear enlace', exact: true }).tap()
    const link = page.getByText(/\/r\/[A-Za-z0-9_-]{22}$/)
    await expect(link).toBeVisible()
    expect(await userSelect(link)).toBe('all')
  })
})

test.describe('with a mouse', () => {
  // Not the weekdays: the swipe area keeps them unselectable with a mouse too (see above).
  test('read-only text stays selectable', async ({ page }) => {
    await page.goto('/')
    expect(await isCoarsePointer(page)).toBe(false)
    await expect(greeting(page)).toBeVisible()
    expect(await userSelect(greeting(page))).not.toBe('none')
  })
})
