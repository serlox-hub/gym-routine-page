import { test, expect } from '@playwright/test'

// Tests de detalle de sesión - requieren usuario autenticado
test.describe('Detalle de sesión', () => {
  test('puede acceder al historial', async ({ page }) => {
    await page.goto('/history')

    await expect(page).toHaveURL(/\/history/)
    // Verificar que la página de historial carga (puede ser calendario o lista)
    await page.waitForTimeout(2000)
    // La página debe cargar sin errores
    await expect(page.locator('body')).toBeVisible()
  })

  test('puede ver una sesión desde el historial', async ({ page }) => {
    await page.goto('/history')

    await expect(page).toHaveURL(/\/history/)
    await page.waitForTimeout(2000)

    // Si hay sesiones, debería haber enlaces a ellas (la ruta es /history/:sessionId)
    const sessionLinks = page.locator('a[href*="/history/"]').filter({ hasNotText: /^$/ })
    const count = await sessionLinks.count()

    // Si hay sesiones, navegar a la primera
    if (count > 0) {
      await sessionLinks.first().click()
      await expect(page).toHaveURL(/\/history\/\d+/)
      await expect(page.getByRole('heading', { name: /detalle de sesión/i })).toBeVisible()
    }
  })

  test('detalle de sesión muestra información básica', async ({ page }) => {
    await page.goto('/history')
    await page.waitForTimeout(2000)

    // Buscar sesiones en el historial
    const sessionLinks = page.locator('a[href*="/history/"]').filter({ hasNotText: /^$/ })
    const count = await sessionLinks.count()

    if (count > 0) {
      await sessionLinks.first().click()

      // Verificar secciones principales
      await expect(page.getByRole('heading', { name: /detalle de sesión/i })).toBeVisible()

      // Info de la sesión (fecha, hora, etc.)
      await expect(page.getByText(/fecha/i)).toBeVisible()

      // Sección de ejercicios
      await expect(page.getByRole('heading', { name: /ejercicios/i })).toBeVisible()
    }
  })

  test('puede volver al historial desde detalle de sesión', async ({ page }) => {
    await page.goto('/history')
    await page.waitForTimeout(2000)

    const sessionLinks = page.locator('a[href*="/history/"]').filter({ hasNotText: /^$/ })
    const count = await sessionLinks.count()

    if (count > 0) {
      await sessionLinks.first().click()
      await expect(page).toHaveURL(/\/history\/\d+/)

      // Buscar botón de volver
      const backButton = page.locator('header button').first()
      await backButton.click()

      // Debería volver al historial
      await expect(page).toHaveURL(/\/history/)
    }
  })
})

// Tests de entrenamiento libre
test.describe('Entrenamiento libre', () => {
  test('puede iniciar entrenamiento libre desde home', async ({ page }) => {
    await page.goto('/')

    // Buscar botón de entrenamiento libre
    const freeWorkoutButton = page.getByRole('button', { name: /libre|free/i })

    if (await freeWorkoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await freeWorkoutButton.click()

      // Verificar que estamos en la sesión de entrenamiento libre
      await expect(page.getByText(/entrenamiento libre/i)).toBeVisible({ timeout: 10000 })
    }
  })

  test('entrenamiento libre permite añadir ejercicios', async ({ page }) => {
    await page.goto('/')

    const freeWorkoutButton = page.getByRole('button', { name: /libre|free/i })

    if (await freeWorkoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await freeWorkoutButton.click()

      // Esperar a que cargue la sesión
      await expect(page.getByText(/entrenamiento libre/i)).toBeVisible({ timeout: 10000 })

      // Debería haber opción de añadir ejercicio
      const addButton = page.getByRole('button', { name: /añadir|agregar|primer ejercicio/i })
      await expect(addButton).toBeVisible()
    }
  })

  test('entrenamiento libre tiene botones de cancelar y finalizar', async ({ page }) => {
    await page.goto('/')

    const freeWorkoutButton = page.getByRole('button', { name: /libre|free/i })

    if (await freeWorkoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await freeWorkoutButton.click()

      await expect(page.getByText(/entrenamiento libre/i)).toBeVisible({ timeout: 10000 })

      // Verificar botones de acción
      await expect(page.getByRole('button', { name: /cancelar/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /finalizar/i })).toBeVisible()
    }
  })

  test('puede cancelar entrenamiento libre', async ({ page }) => {
    await page.goto('/')

    const freeWorkoutButton = page.getByRole('button', { name: /libre|free/i })

    if (await freeWorkoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await freeWorkoutButton.click()

      await expect(page.getByText(/entrenamiento libre/i)).toBeVisible({ timeout: 10000 })

      // Cancelar entrenamiento
      await page.getByRole('button', { name: /cancelar/i }).click()

      // Confirmar cancelación
      const confirmButton = page.getByRole('button', { name: /sí, cancelar/i })
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }

      // Debería volver a home
      await expect(page).toHaveURL(/\/$/, { timeout: 10000 })
    }
  })
})

// Tests de protección de rutas
test.describe('Protección de rutas de sesión', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('history requiere autenticación', async ({ page }) => {
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })

  test('session detail requiere autenticación', async ({ page }) => {
    await page.goto('/history/1')
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })

  test('free workout requiere autenticación', async ({ page }) => {
    await page.goto('/workout/free')
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })
})
