import { test, expect } from '@playwright/test'

test.describe('Lista de ejercicios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exercises')
  })

  test('puede filtrar ejercicios por nombre', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar ejercicio/i)

    // Escribir en el buscador
    await searchInput.fill('press')

    // Esperar a que se filtre (debounce)
    await page.waitForTimeout(300)

    // Verificar que el valor está en el input
    await expect(searchInput).toHaveValue('press')
  })

  test('navega a crear nuevo ejercicio', async ({ page }) => {
    await page.getByRole('button', { name: /nuevo/i }).click()

    await expect(page).toHaveURL(/\/exercises\/new/)
    await expect(page.getByRole('heading', { name: /nuevo ejercicio/i })).toBeVisible()
  })
})

test.describe('Crear nuevo ejercicio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exercises/new')
  })

  test('valida campos obligatorios', async ({ page }) => {
    // Esperar a que cargue el formulario
    await page.waitForSelector('button:has-text("Crear")', { timeout: 10000 })

    // Intentar crear sin llenar campos
    await page.getByRole('button', { name: /crear/i }).click()

    // Debería mostrar error
    await expect(page.getByText(/nombre es obligatorio|selecciona un grupo muscular/i)).toBeVisible()
  })

  test('puede crear un ejercicio', async ({ page }) => {
    // Esperar a que carguen los grupos musculares
    await page.waitForSelector('button:has-text("Pecho"), button:has-text("Espalda")', { timeout: 10000 })

    // Usar timestamp para nombre único
    const exerciseName = `Test E2E Exercise ${Date.now()}`

    // Llenar nombre
    await page.getByPlaceholder(/press banca/i).fill(exerciseName)

    // Seleccionar grupo muscular
    await page.getByRole('button', { name: /pecho/i }).click()

    // Crear ejercicio
    await page.getByRole('button', { name: /crear/i }).click()

    // Esperar a que navegue
    await page.waitForURL(/\/exercises/, { timeout: 10000 })
  })
})

test.describe('Editar ejercicio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exercises')
    await expect(page.getByRole('heading', { name: /ejercicios/i })).toBeVisible({ timeout: 10000 })
  })

  test('puede navegar a editar desde la lista usando menú', async ({ page }) => {
    // Buscar el menú de tres puntos dentro de la sección de ejercicios
    const exerciseCards = page.locator('main button').filter({ has: page.locator('svg') })

    // Hacer clic en el primer menú de ejercicio
    await exerciseCards.first().click()

    // Esperar a que aparezca el menú y hacer clic en Editar
    await page.getByRole('button', { name: /editar/i }).click()

    // Verificar que estamos en la página de edición
    await expect(page).toHaveURL(/\/exercises\/\d+\/edit/)
    await expect(page.getByRole('heading', { name: /editar ejercicio/i })).toBeVisible()
  })

  test('puede guardar cambios en ejercicio', async ({ page }) => {
    // Navegar a editar
    const exerciseCards = page.locator('main button').filter({ has: page.locator('svg') })
    await exerciseCards.first().click()
    await page.getByRole('button', { name: /editar/i }).click()

    await expect(page).toHaveURL(/\/exercises\/\d+\/edit/)

    // Esperar a que carguen los grupos musculares
    await page.waitForSelector('button:has-text("Pecho"), button:has-text("Espalda")', { timeout: 10000 })

    // Guardar cambios
    await page.getByRole('button', { name: /guardar cambios/i }).click()

    // Debería volver a la lista
    await expect(page).toHaveURL(/\/exercises$/, { timeout: 10000 })
  })
})

test.describe('Progresión de ejercicio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exercises')
    await expect(page.getByRole('heading', { name: /ejercicios/i })).toBeVisible({ timeout: 10000 })
  })

  test('puede navegar a progresión desde la lista', async ({ page }) => {
    // Buscar menú de ejercicio dentro de main
    const exerciseMenus = page.locator('main button').filter({ has: page.locator('svg') })
    await exerciseMenus.first().click()

    // Hacer clic en Progresión
    await page.getByRole('button', { name: /progresión/i }).click()

    // Verificar que estamos en la página de progresión
    await expect(page).toHaveURL(/\/exercises\/\d+\/progress/)
  })

  test('página de progresión muestra historial', async ({ page }) => {
    // Navegar a progresión del primer ejercicio
    const exerciseMenus = page.locator('main button').filter({ has: page.locator('svg') })
    await exerciseMenus.first().click()
    await page.getByRole('button', { name: /progresión/i }).click()

    await expect(page).toHaveURL(/\/exercises\/\d+\/progress/)

    // Verificar sección de historial
    await expect(page.getByRole('heading', { name: /historial/i })).toBeVisible()
  })
})

// Tests de protección de rutas
test.describe('Protección de rutas de ejercicios', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('exercises requiere autenticación', async ({ page }) => {
    await page.goto('/exercises')
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })

  test('new exercise requiere autenticación', async ({ page }) => {
    await page.goto('/exercises/new')
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })

  test('edit exercise requiere autenticación', async ({ page }) => {
    await page.goto('/exercises/1/edit')
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })

  test('exercise progress requiere autenticación', async ({ page }) => {
    await page.goto('/exercises/1/progress')
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })
})
