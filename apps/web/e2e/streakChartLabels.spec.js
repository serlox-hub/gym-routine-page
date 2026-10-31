import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import '../scripts/loadEnv.js'

// The streak card's minutes above each bar (issue #216). A day with a workout shows its minutes,
// whole, inside the chart: the axis leaves room above the tallest bar (`getChartMaxWithLabelRoom`)
// instead of letting the plot's top clip the number. A day without one shows nothing.
//
// Runs on its OWN user (`supabase/seed.sql`): today's bar adds up every session of the day, and the
// other specs add theirs to the shared user.
const EMAIL = process.env.E2E_HOME_TEST_EMAIL
const PASSWORD = process.env.E2E_HOME_TEST_PASSWORD
if (!EMAIL || !PASSWORD) {
  throw new Error('Missing E2E_HOME_TEST_EMAIL and E2E_HOME_TEST_PASSWORD in apps/web/.env.local (see .env.example).')
}

// Three digits, the widest realistic label, and over the 60 minute floor of the axis: its bar is the
// week's tallest, the one whose label the plot's top would clip.
const SESSION_MINUTES = 106
const DAYS_IN_WEEK = 7

test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
// Both tests read the session `beforeAll` seeds: in parallel each worker would delete the other's.
test.describe.configure({ mode: 'serial' })

/** Leaves the user with exactly one finished session, today, of `SESSION_MINUTES`. */
async function seedTodaysSession() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  expect(error).toBeNull()
  const userId = data.user.id

  const { error: deleteError } = await supabase.from('workout_sessions').delete().eq('user_id', userId)
  if (deleteError) throw deleteError
  const completedAt = new Date()
  const startedAt = new Date(completedAt.getTime() - SESSION_MINUTES * 60_000)
  const { error: insertError } = await supabase.from('workout_sessions').insert({
    user_id: userId,
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    status: 'completed',
    duration_minutes: SESSION_MINUTES,
  })
  if (insertError) throw insertError
}

async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

test.beforeAll(seedTodaysSession)

test('a day with a workout shows its minutes whole above its bar, a day without shows none', async ({ page }) => {
  await login(page)

  const card = page.getByTestId('streak-card')
  const chart = card.locator('.recharts-surface')
  const labels = card.locator('.recharts-label-list text')

  // Seven bars (empty days keep a placeholder one), one label: only today's
  await expect(card.locator('.recharts-bar-rectangle')).toHaveCount(DAYS_IN_WEEK)
  await expect(labels).toHaveCount(1)
  await expect(labels).toHaveText(String(SESSION_MINUTES))
  await expect(labels).toBeVisible()

  // The SVG clips whatever falls outside it: a label sticking out of its box is cut, not moved
  const labelBox = await labels.boundingBox()
  const chartBox = await chart.boundingBox()
  expect(labelBox.y).toBeGreaterThanOrEqual(chartBox.y)
  expect(labelBox.x).toBeGreaterThanOrEqual(chartBox.x)
  expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(chartBox.x + chartBox.width)
  expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(chartBox.y + chartBox.height)
})

// The recharts Tooltip that used to show the minutes is gone: the tap on a bar still opens its day
test('a tap on the bar with a workout opens History', async ({ page }) => {
  await login(page)
  // Only a bar with minutes outside a rest week is clickable, and only that one gets the pointer
  await page.getByTestId('streak-card').locator('.recharts-bar-rectangle [cursor=pointer]').tap()
  await expect(page).toHaveURL('/history')
})

// The whole column of a bar takes the click (native resolves it by column), so the minutes printed
// above it do too. The label is `pointer-events: none`, so `locator.click()` refuses to hit it: this
// clicks its coordinates. A mouse click, not a touch tap: the browser snaps a finger that lands a few
// px from a bar onto the bar, so a tap opens the day even with nothing under the label.
async function clickAt(page, box) {
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

test('a click on the minutes above the bar with a workout opens History', async ({ page }) => {
  await login(page)
  const labels = page.getByTestId('streak-card').locator('.recharts-label-list text')
  await expect(labels).toHaveText(String(SESSION_MINUTES))

  await clickAt(page, await labels.boundingBox())
  await expect(page).toHaveURL('/history')
})

// The column being clickable must not open a day that has nothing: the click handler only opens a
// day with minutes, and a rest day's column (its placeholder bar is short) takes the same click.
test('a click on the column of a day without a workout does nothing', async ({ page }) => {
  await login(page)
  const card = page.getByTestId('streak-card')
  const labels = card.locator('.recharts-label-list text')
  const columns = card.locator('.recharts-bar-background-rectangle')
  await expect(labels).toHaveText(String(SESSION_MINUTES))
  await expect(columns).toHaveCount(DAYS_IN_WEEK)

  const labelBox = await labels.boundingBox()
  const labelCenterX = labelBox.x + labelBox.width / 2
  // Any column that is not today's: the label sits at the center of the column it belongs to
  let emptyColumnBox = null
  for (let index = 0; index < DAYS_IN_WEEK; index += 1) {
    const box = await columns.nth(index).boundingBox()
    if (labelCenterX < box.x || labelCenterX > box.x + box.width) {
      emptyColumnBox = box
      break
    }
  }
  expect(emptyColumnBox).not.toBeNull()

  // Near the top of the column, well above the placeholder bar
  await page.mouse.click(emptyColumnBox.x + emptyColumnBox.width / 2, emptyColumnBox.y + 4)
  // A click that did open the day would have left the page by now, and the card (with its label) with it
  await expect(page).toHaveURL('/')
  await expect(labels).toHaveText(String(SESSION_MINUTES))

  // Control: the same kind of click on the workout's column does open it
  await clickAt(page, labelBox)
  await expect(page).toHaveURL('/history')
})
