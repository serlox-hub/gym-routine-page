import { test, expect } from '@playwright/test'

test.describe('Crear rutina desde template', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('puede abrir modal de nueva rutina', async ({ page }) => {
    // Buscar botón/card de nueva rutina
    const newRoutineButton = page.getByText(/nueva rutina/i).first()

    await expect(newRoutineButton).toBeVisible({ timeout: 5000 })
    await newRoutineButton.click()

    // Verificar que se abre el modal con opciones
    await expect(page.getByText(/rutinas predefinidas/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/crear manualmente/i)).toBeVisible()
    await expect(page.getByText(/importar json/i)).toBeVisible()
  })

  test('puede ver templates disponibles', async ({ page }) => {
    const newRoutineButton = page.getByText(/nueva rutina/i).first()
    await newRoutineButton.click()

    // Click en rutinas predefinidas
    await page.getByText(/rutinas predefinidas/i).click()

    // Verificar que se muestran los templates
    await expect(page.getByText(/ppl|push.*pull.*legs/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('puede crear rutina desde template PPL', async ({ page }) => {
    const newRoutineButton = page.getByText(/nueva rutina/i).first()
    await newRoutineButton.click()

    await page.getByText(/rutinas predefinidas/i).click()

    // Buscar y seleccionar PPL
    const pplTemplate = page.getByText(/ppl|push.*pull.*legs/i).first()

    if (!await pplTemplate.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip()
      return
    }

    await pplTemplate.click()

    // Esperar modal de opciones de importación
    const importButton = page.getByRole('button', { name: /importar|crear|confirmar/i }).first()

    if (await importButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await importButton.click()

      // Verificar que se creó y navegó a la rutina
      await expect(page).toHaveURL(/\/routine\/\d+/, { timeout: 10000 })

      // Verificar que tiene días (Push, Pull, Legs)
      await expect(page.getByText(/push|pull|legs|pierna/i).first()).toBeVisible()
    }
  })

  test('puede crear rutina manualmente', async ({ page }) => {
    const newRoutineButton = page.getByText(/nueva rutina/i).first()
    await newRoutineButton.click()

    // Click en crear manualmente
    await page.getByText(/crear manualmente/i).click()

    // Verificar que navega al formulario de nueva rutina
    await expect(page).toHaveURL(/\/routines\/new/, { timeout: 5000 })

    // Verificar que el formulario está visible
    await expect(page.getByText(/nombre/i).first()).toBeVisible()
  })

  test('formulario de nueva rutina tiene campos requeridos', async ({ page }) => {
    await page.goto('/routines/new')

    // Verificar campos del formulario (placeholder: "Ej: Push Pull Legs")
    await expect(page.getByPlaceholder(/push pull legs/i)).toBeVisible({ timeout: 5000 })

    // Verificar botón de guardar
    await expect(page.getByRole('button', { name: /crear rutina/i })).toBeVisible()
  })

  test('puede crear rutina con nombre y descripción', async ({ page }) => {
    await page.goto('/routines/new')

    // Rellenar nombre
    const nameInput = page.locator('input').first()
    await nameInput.fill('Rutina E2E Test')

    // Rellenar descripción si existe
    const descInput = page.locator('textarea').first()

    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill('Descripción de test')
    }

    // Guardar
    const saveButton = page.getByRole('button', { name: /guardar|crear/i }).first()
    await saveButton.click()

    // Verificar que se creó (navega a la rutina o muestra mensaje)
    await expect(page).toHaveURL(/\/routine\/\d+/, { timeout: 10000 })
  })
})

test.describe('Editar rutina existente', () => {
  // Helper para navegar a la rutina de test
  async function navigateToTestRoutine(page) {
    await page.waitForLoadState('networkidle')

    const routineCard = page.locator('text=Rutina E2E Test').first()

    if (!await routineCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      return false
    }

    await routineCard.click()
    await expect(page).toHaveURL(/\/routine\/\d+/)
    return true
  }

  test('puede añadir día a rutina en modo edición', async ({ page }) => {
    await page.goto('/')

    if (!await navigateToTestRoutine(page)) {
      test.skip()
      return
    }

    // Abrir menú (icono de 3 puntos verticales)
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).last()
    await menuButton.click()

    // Entrar en modo edición desde el menú
    const editOption = page.getByText('Editar').first()

    if (!await editOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip()
      return
    }

    await editOption.click()

    // Buscar botón de añadir día (solo visible en modo edición)
    const addDayButton = page.getByText(/añadir día/i).first()
    await expect(addDayButton).toBeVisible({ timeout: 5000 })

    await addDayButton.click()

    // Verificar que se abre el modal (placeholder: "Ej: Pecho y tríceps")
    await expect(page.getByPlaceholder(/pecho y tríceps/i)).toBeVisible({ timeout: 3000 })
  })

  test('puede expandir día y ver ejercicios', async ({ page }) => {
    await page.goto('/')

    if (!await navigateToTestRoutine(page)) {
      test.skip()
      return
    }

    // Click en el día para expandirlo
    const dayCard = page.getByText(/día test/i).first()

    if (await dayCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayCard.click()

      // Verificar que se expande y muestra botón de entrenar
      await expect(page.getByRole('button', { name: /iniciar entrenamiento/i }).first()).toBeVisible({ timeout: 5000 })
    }
  })
})
