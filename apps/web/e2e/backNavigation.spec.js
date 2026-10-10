import { test, expect } from '@playwright/test'

// `goBack()` (src/lib/historyBack.js) reads `history.state.idx`, an internal field of
// React Router's history. These run against the real router so an upgrade that drops it fails here.
const ROUTINE = 'Rutina E2E Test'

test.describe('Volver', () => {
  test('con una pantalla de la app detrás, vuelve a ella', async ({ page }) => {
    await page.goto('/routines')
    await page.getByText(ROUTINE).click()
    await expect(page).toHaveURL(/\/routine\/\d+$/)
    const routineUrl = page.url()

    await page.getByRole('button', { name: 'Volver' }).click()

    await expect(page).toHaveURL(/\/routines$/)
    // A real `navigate(-1)` leaves the routine ahead; a replace to the fallback would not.
    await page.goForward()
    await expect(page).toHaveURL(routineUrl)
  })

  test('abierta directamente, no sale de la app', async ({ page }) => {
    await page.goto('/routines')
    await page.getByText(ROUTINE).click()
    await expect(page).toHaveURL(/\/routine\/\d+$/)
    const routineUrl = page.url()

    const fresh = await page.context().newPage()
    await fresh.goto(routineUrl)
    await fresh.getByRole('button', { name: 'Volver' }).click()

    await expect(fresh).toHaveURL(/\/routines$/)
  })
})
