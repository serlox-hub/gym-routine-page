import { test, expect } from '@playwright/test'

test.describe('Registrar peso corporal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/body-weight')
  })

  test('puede registrar un peso', async ({ page }) => {
    await page.getByRole('button', { name: /registrar peso/i }).click()

    // Llenar peso con valor único
    const peso = (70 + Math.random() * 10).toFixed(1)
    await page.getByPlaceholder(/75\.5/i).fill(peso)

    // Registrar
    await page.getByRole('button', { name: /^registrar$/i }).click()

    // El modal debería cerrarse
    await expect(page.getByRole('heading', { name: /registrar peso/i })).toBeHidden({ timeout: 10000 })

    // El peso debería aparecer en la página
    await expect(page.getByText(/kg/).first()).toBeVisible()
  })
})

test.describe('Estadísticas de peso', () => {
  test('muestra estadísticas si hay registros', async ({ page }) => {
    await page.goto('/body-weight')

    // Primero registrar un peso para asegurar que hay datos
    await page.getByRole('button', { name: /registrar peso/i }).click()
    await page.getByPlaceholder(/75\.5/i).fill('75')
    await page.getByRole('button', { name: /^registrar$/i }).click()

    // Esperar a que se cierre el modal
    await page.waitForTimeout(1000)

    // Las estadísticas deberían mostrarse
    await expect(page.getByText(/actual/i)).toBeVisible()
    await expect(page.getByText(/kg/).first()).toBeVisible()
  })
})

test.describe('Historial de peso', () => {
  test('historial muestra registros existentes', async ({ page }) => {
    await page.goto('/body-weight')

    // Primero registrar un peso
    const peso = (70 + Math.random() * 10).toFixed(1)
    await page.getByRole('button', { name: /registrar peso/i }).click()
    await page.getByPlaceholder(/75\.5/i).fill(peso)
    await page.getByPlaceholder(/después de desayunar/i).fill('Test historial')
    await page.getByRole('button', { name: /^registrar$/i }).click()

    // Esperar a que se guarde
    await page.waitForTimeout(1000)

    // Verificar que aparece en la página
    await expect(page.getByRole('heading', { name: /historial/i })).toBeVisible()
    await expect(page.getByText(/kg/).first()).toBeVisible()
  })

  test('registros tienen botones de editar y eliminar', async ({ page }) => {
    await page.goto('/body-weight')

    // Registrar un peso primero
    await page.getByRole('button', { name: /registrar peso/i }).click()
    await page.getByPlaceholder(/75\.5/i).fill('77')
    await page.getByRole('button', { name: /^registrar$/i }).click()

    // Esperar a que se guarde
    await page.waitForTimeout(1000)

    // Buscar botones de acción en el historial
    const buttons = page.getByRole('button').filter({ has: page.locator('svg') })

    // Debería haber al menos 2 botones de acción (editar y eliminar) por registro
    const count = await buttons.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

// Tests de protección de rutas
test.describe('Protección de rutas de peso corporal', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('body-weight requiere autenticación', async ({ page }) => {
    await page.goto('/body-weight')
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })
})
