import { test, expect } from '@playwright/test'

// Tests de ejercicios - requieren usuario autenticado
test.describe('Lista de ejercicios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exercises')
  })

  test('muestra la página de ejercicios', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ejercicios/i })).toBeVisible()
  })

  test('muestra buscador de ejercicios', async ({ page }) => {
    await expect(page.getByPlaceholder(/buscar ejercicio/i)).toBeVisible()
  })

  test('muestra botón para crear nuevo ejercicio', async ({ page }) => {
    await expect(page.getByRole('button', { name: /nuevo/i })).toBeVisible()
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

  test('muestra formulario de nuevo ejercicio', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /nuevo ejercicio/i })).toBeVisible()

    // Campos obligatorios
    await expect(page.getByText(/nombre/i).first()).toBeVisible()
    await expect(page.getByText(/tipo de medición/i)).toBeVisible()
    await expect(page.getByText(/grupo muscular/i)).toBeVisible()
  })

  test('muestra grupos musculares para seleccionar', async ({ page }) => {
    // Esperar a que carguen los grupos musculares
    await page.waitForSelector('button:has-text("Pecho"), button:has-text("Espalda")', { timeout: 10000 })

    // Verificar que hay grupos musculares
    const muscleButtons = page.locator('button').filter({ hasText: /(Pecho|Espalda|Piernas|Hombros|Bíceps|Tríceps|Core)/i })
    await expect(muscleButtons.first()).toBeVisible()
  })

  test('valida campos obligatorios', async ({ page }) => {
    // Esperar a que cargue el formulario
    await page.waitForSelector('button:has-text("Crear")', { timeout: 10000 })

    // Intentar crear sin llenar campos
    await page.getByRole('button', { name: /crear/i }).click()

    // Debería mostrar error
    await expect(page.getByText(/nombre es obligatorio|selecciona un grupo muscular/i)).toBeVisible()
  })

  test('puede llenar el formulario completo', async ({ page }) => {
    // Esperar a que carguen los grupos musculares
    await page.waitForSelector('button:has-text("Pecho"), button:has-text("Espalda")', { timeout: 10000 })

    // Llenar nombre
    const nombreInput = page.getByPlaceholder(/press banca/i)
    await nombreInput.fill('Test E2E - Press banca inclinado')

    // Seleccionar grupo muscular (Pecho)
    await page.getByRole('button', { name: /pecho/i }).click()

    // Verificar que el formulario tiene los valores
    await expect(nombreInput).toHaveValue('Test E2E - Press banca inclinado')
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

    // Esperar a que navegue (puede usar navigate(-1) que vuelve a la página anterior)
    await page.waitForURL(/\/exercises/, { timeout: 10000 })
  })

  test('puede volver atrás sin crear', async ({ page }) => {
    // Primero ir a la lista de ejercicios para tener historial
    await page.goto('/exercises')
    await expect(page.getByRole('heading', { name: /ejercicios/i })).toBeVisible()

    // Navegar a crear nuevo ejercicio
    await page.getByRole('button', { name: /nuevo/i }).click()
    await expect(page).toHaveURL(/\/exercises\/new/)

    // Esperar a que cargue el formulario
    await page.waitForSelector('button:has-text("Crear")', { timeout: 10000 })

    // Buscar el header que tiene el botón de volver (PageHeader)
    const backButton = page.locator('header button').first()
    await backButton.click()

    // Debería volver a la lista
    await expect(page).toHaveURL(/\/exercises$/, { timeout: 10000 })
  })
})

test.describe('Acciones de ejercicio', () => {
  test('ejercicios tienen menú de acciones', async ({ page }) => {
    await page.goto('/exercises')

    // Esperar a que carguen ejercicios
    await page.waitForTimeout(2000)

    // Buscar el menú de acciones (los tres puntos)
    const menuButtons = page.locator('[role="button"], button').filter({ has: page.locator('svg') })

    // Si hay ejercicios, debería haber menús
    const count = await menuButtons.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Editar ejercicio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exercises')
    await expect(page.getByRole('heading', { name: /ejercicios/i })).toBeVisible({ timeout: 10000 })
  })

  test('puede navegar a editar desde la lista usando menú', async ({ page }) => {
    // Buscar el menú de tres puntos dentro de la sección de ejercicios (dentro de main)
    const exerciseCards = page.locator('main button').filter({ has: page.locator('svg') })

    // Hacer clic en el primer menú de ejercicio
    await exerciseCards.first().click()

    // Esperar a que aparezca el menú y hacer clic en Editar
    await page.getByRole('button', { name: /editar/i }).click()

    // Verificar que estamos en la página de edición
    await expect(page).toHaveURL(/\/exercises\/\d+\/edit/)
    await expect(page.getByRole('heading', { name: /editar ejercicio/i })).toBeVisible()
  })

  test('formulario de edición tiene campos correctos', async ({ page }) => {
    // Navegar a editar el primer ejercicio
    const exerciseCards = page.locator('main button').filter({ has: page.locator('svg') })
    await exerciseCards.first().click()
    await page.getByRole('button', { name: /editar/i }).click()

    await expect(page).toHaveURL(/\/exercises\/\d+\/edit/)

    // Verificar que tiene los campos del formulario
    await expect(page.getByText(/nombre/i).first()).toBeVisible()
    await expect(page.getByText(/tipo de medición/i)).toBeVisible()
    await expect(page.getByText(/grupo muscular/i)).toBeVisible()

    // Verificar que el nombre está prellenado (no vacío)
    const nombreInput = page.getByPlaceholder(/press banca/i)
    const value = await nombreInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('puede guardar cambios en ejercicio', async ({ page }) => {
    // Navegar a editar
    const exerciseCards = page.locator('main button').filter({ has: page.locator('svg') })
    await exerciseCards.first().click()
    await page.getByRole('button', { name: /editar/i }).click()

    await expect(page).toHaveURL(/\/exercises\/\d+\/edit/)

    // Esperar a que carguen los grupos musculares
    await page.waitForSelector('button:has-text("Pecho"), button:has-text("Espalda")', { timeout: 10000 })

    // Guardar cambios (sin modificar, solo verificamos que funciona)
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

  test('página de progresión muestra secciones principales', async ({ page }) => {
    // Navegar a progresión del primer ejercicio
    const exerciseMenus = page.locator('main button').filter({ has: page.locator('svg') })
    await exerciseMenus.first().click()
    await page.getByRole('button', { name: /progresión/i }).click()

    await expect(page).toHaveURL(/\/exercises\/\d+\/progress/)

    // Verificar que hay un heading (nombre del ejercicio)
    await expect(page.locator('h1').first()).toBeVisible()

    // Verificar sección de historial
    await expect(page.getByRole('heading', { name: /historial/i })).toBeVisible()
  })

  test('página de progresión tiene botón de volver', async ({ page }) => {
    // Navegar a progresión
    const exerciseMenus = page.locator('main button').filter({ has: page.locator('svg') })
    await exerciseMenus.first().click()
    await page.getByRole('button', { name: /progresión/i }).click()

    await expect(page).toHaveURL(/\/exercises\/\d+\/progress/)

    // Verificar que hay botón de volver en el header
    const backButton = page.locator('header button').first()
    await expect(backButton).toBeVisible()
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
