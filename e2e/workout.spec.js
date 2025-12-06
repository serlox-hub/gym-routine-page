import { test, expect } from '@playwright/test'

// Tests de sesión de entrenamiento - requieren usuario autenticado
// El proyecto 'authenticated' en playwright.config.js proporciona la sesión
test.describe('Sesión de entrenamiento', () => {
  test('puede ver la home autenticado', async ({ page }) => {
    await page.goto('/')

    // Verificar que estamos en la home (no en login)
    await expect(page).not.toHaveURL(/\/login/)

    // Debería mostrar contenido de la app
    await expect(page.getByText(/rutina|entrenar/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('puede navegar a una rutina', async ({ page }) => {
    await page.goto('/')

    // Buscar si hay rutinas disponibles
    const routineLink = page.locator('a[href*="/routine/"]').first()

    // Si hay rutinas, navegar a la primera
    if (await routineLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await routineLink.click()
      await expect(page).toHaveURL(/\/routine\/\d+/)
    }
  })

  test('puede acceder al historial', async ({ page }) => {
    await page.goto('/history')

    // Verificar que estamos en history (no redirigió a login)
    await expect(page).toHaveURL(/\/history/)
  })
})

// Tests de workout cuando hay una sesión activa
test.describe('Flujo de entrenamiento', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('puede iniciar sesión de entrenamiento si hay rutinas', async ({ page }) => {
    // Buscar botón de entrenar
    const trainButton = page.getByRole('button', { name: /entrenar|comenzar/i }).first()

    if (await trainButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trainButton.click()

      // Verificar que se muestra algo relacionado con la sesión
      await expect(page.getByText(/serie|set|ejercicio/i).first()).toBeVisible({ timeout: 10000 })
    }
  })
})

// Tests que no requieren autenticación - verifican que las rutas están protegidas
// Estos corren en el proyecto 'chromium' sin auth
test.describe('Protección de rutas', () => {
  // Usamos un nuevo contexto sin autenticación
  test.use({ storageState: { cookies: [], origins: [] } })

  test('workout requiere autenticación', async ({ page }) => {
    await page.goto('/routine/1/day/1/workout')

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })

  test('history requiere autenticación', async ({ page }) => {
    await page.goto('/history')

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })

  test('routine detail requiere autenticación', async ({ page }) => {
    await page.goto('/routine/1')

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 10000 })
  })
})
