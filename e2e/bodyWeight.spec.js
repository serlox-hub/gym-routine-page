import { test, expect } from '@playwright/test'

// Tests de peso corporal - requieren usuario autenticado
test.describe('Página de peso corporal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/body-weight')
  })

  test('muestra la página de peso corporal', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /peso corporal/i })).toBeVisible()
  })

  test('muestra botón para registrar peso', async ({ page }) => {
    await expect(page.getByRole('button', { name: /registrar peso/i })).toBeVisible()
  })

  test('muestra sección de historial', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /historial/i })).toBeVisible()
  })
})

test.describe('Registrar peso corporal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/body-weight')
  })

  test('abre modal al hacer clic en registrar peso', async ({ page }) => {
    await page.getByRole('button', { name: /registrar peso/i }).click()

    // Verificar que el modal está abierto
    await expect(page.getByRole('heading', { name: /registrar peso/i })).toBeVisible()
    await expect(page.getByPlaceholder(/75\.5/i)).toBeVisible()
  })

  test('modal tiene campos de peso y notas', async ({ page }) => {
    await page.getByRole('button', { name: /registrar peso/i }).click()

    // Campo de peso
    await expect(page.getByText(/peso \(kg\)/i)).toBeVisible()
    await expect(page.getByPlaceholder(/75\.5/i)).toBeVisible()

    // Campo de notas
    await expect(page.getByText(/notas/i)).toBeVisible()
    await expect(page.getByPlaceholder(/después de desayunar/i)).toBeVisible()
  })

  test('puede cerrar modal con botón cancelar', async ({ page }) => {
    await page.getByRole('button', { name: /registrar peso/i }).click()

    // Verificar que el modal está abierto
    await expect(page.getByRole('heading', { name: /registrar peso/i })).toBeVisible()

    // Cancelar
    await page.getByRole('button', { name: /cancelar/i }).click()

    // El modal debería cerrarse
    await expect(page.getByRole('heading', { name: /registrar peso/i })).toBeHidden()
  })

  test('puede cerrar modal al hacer clic fuera', async ({ page }) => {
    await page.getByRole('button', { name: /registrar peso/i }).click()

    // Verificar que el modal está abierto
    await expect(page.getByRole('heading', { name: /registrar peso/i })).toBeVisible()

    // Hacer clic en el overlay (fuera del modal)
    await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } })

    // El modal debería cerrarse
    await expect(page.getByRole('heading', { name: /registrar peso/i })).toBeHidden()
  })

  test('botón registrar está deshabilitado sin peso', async ({ page }) => {
    await page.getByRole('button', { name: /registrar peso/i }).click()

    // El botón Registrar debería estar deshabilitado
    const registerButton = page.getByRole('button', { name: /^registrar$/i })
    await expect(registerButton).toBeDisabled()
  })

  test('puede llenar el formulario de peso', async ({ page }) => {
    await page.getByRole('button', { name: /registrar peso/i }).click()

    // Llenar peso
    const weightInput = page.getByPlaceholder(/75\.5/i)
    await weightInput.fill('80.5')

    // Llenar notas
    const notesInput = page.getByPlaceholder(/después de desayunar/i)
    await notesInput.fill('Test E2E nota')

    // Verificar valores
    await expect(weightInput).toHaveValue('80.5')
    await expect(notesInput).toHaveValue('Test E2E nota')

    // Botón debería estar habilitado
    const registerButton = page.getByRole('button', { name: /^registrar$/i })
    await expect(registerButton).toBeEnabled()
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

    // El peso debería aparecer en la página (en estadísticas o historial)
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
    // Los botones están dentro de divs genéricos, buscamos por rol
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
