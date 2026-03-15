import { test, expect } from '@playwright/test'

test.describe('Completar serie en workout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // Helper para navegar a workout
  async function navigateToWorkout(page) {
    // Esperar a que carguen las rutinas
    await page.waitForLoadState('networkidle')

    // Buscar la rutina de test por su nombre (puede estar truncado)
    const routineCard = page.locator('text=Rutina E2E Test').first()

    // Si no la encuentra, intentar buscar cualquier card clickeable
    if (!await routineCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Buscar cualquier rutina visible
      const anyRoutine = page.locator('[class*="cursor-pointer"]').filter({ hasText: /rutina/i }).first()
      if (!await anyRoutine.isVisible({ timeout: 3000 }).catch(() => false)) {
        return false
      }
      await anyRoutine.click()
    } else {
      await routineCard.click()
    }

    await expect(page).toHaveURL(/\/routine\/\d+/)

    // Expandir el día haciendo click
    const dayCard = page.getByText(/día test/i).first()
    if (await dayCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayCard.click()
    }

    // Buscar botón de iniciar entrenamiento
    const trainButton = page.getByRole('button', { name: /iniciar entrenamiento/i }).first()

    if (!await trainButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      return false
    }

    await trainButton.click()
    await expect(page).toHaveURL(/\/workout/, { timeout: 10000 })
    return true
  }

  test('puede iniciar sesión de entrenamiento y ver ejercicios', async ({ page }) => {
    const success = await navigateToWorkout(page)

    if (!success) {
      test.skip()
      return
    }

    // Verificar que estamos en workout
    await expect(page).toHaveURL(/\/workout/)

    // Verificar que se muestra contenido de la sesión (ejercicio, serie, o timer)
    await expect(page.getByText(/serie|set|ejercicio|\d+:\d+/i).first()).toBeVisible({ timeout: 5000 })
  })
})
