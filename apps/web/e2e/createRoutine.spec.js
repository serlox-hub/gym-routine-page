import { test, expect } from '@playwright/test'

// Crea una rutina vacía desde el flujo de "Nueva rutina" y deja la página en su detalle, con el
// modal de nombre y descripción todavía abierto (es lo que hace el flujo, ver issue #85).
async function createEmptyRoutine(page) {
  await page.goto('/routines')
  await page.getByText(/nueva rutina/i).first().click()
  const createManually = page.getByText(/crear manualmente/i)
  await expect(createManually).toBeVisible({ timeout: 5000 })
  await createManually.click()
  await expect(page).toHaveURL(/\/routine\/\d+$/, { timeout: 10000 })
}

// Abre la rutina sembrada por `testData.setup.js` (un día, un ejercicio).
async function openSeededRoutine(page) {
  await page.goto('/routines')
  const card = page.getByText('Rutina E2E Test', { exact: true }).first()
  await expect(card).toBeVisible({ timeout: 10000 })
  await card.click()
  await expect(page).toHaveURL(/\/routine\/\d+$/)
}

test.describe('Nueva rutina', () => {
  test('puede abrir modal de nueva rutina', async ({ page }) => {
    await page.goto('/routines')
    const newRoutineButton = page.getByText(/nueva rutina/i).first()

    await expect(newRoutineButton).toBeVisible({ timeout: 5000 })
    await newRoutineButton.click()

    await expect(page.getByText(/rutinas predefinidas/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/crear manualmente/i)).toBeVisible()
    await expect(page.getByText(/importar rutina/i)).toBeVisible()
  })

  test('puede crear rutina desde una plantilla predefinida', async ({ page }) => {
    await page.goto('/routines')
    await page.getByText(/nueva rutina/i).first().click()
    await page.getByText(/rutinas predefinidas/i).click()

    await page.getByText('Push Pull Legs (3 días)').click()
    await page.getByRole('button', { name: /usar esta plantilla/i }).click()

    await expect(page.getByText('Push Pull Legs (3 días)').first()).toBeVisible({ timeout: 15000 })
  })

  test('crear manualmente aterriza en el detalle con el modal de nombre y descripción abierto', async ({ page }) => {
    await createEmptyRoutine(page)

    await expect(page.getByRole('heading', { name: 'Editar nombre y descripción' })).toBeVisible()
    // La pantalla de detrás ya es la editable: no hay paso intermedio de "Editar".
    await expect(page.getByRole('button', { name: /añadir día/i })).toBeVisible()
  })

  test('la URL vieja /routine/:id/edit redirige al detalle', async ({ page }) => {
    await createEmptyRoutine(page)
    const detailPath = new URL(page.url()).pathname

    await page.goto(`${detailPath}/edit`)

    await expect(page).toHaveURL(new RegExp(`${detailPath}$`))
    await expect(page.getByRole('button', { name: /añadir día/i })).toBeVisible()
  })
})

test.describe('Detalle de rutina sin modo edición', () => {
  test('las acciones de edición están desde el primer momento', async ({ page }) => {
    await openSeededRoutine(page)

    await expect(page.getByRole('button', { name: /añadir día/i })).toBeVisible()

    await page.getByRole('heading', { name: 'Día Test' }).click()

    await expect(page.getByRole('button', { name: /añadir ejercicio/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /añadir a calentamiento/i })).toBeVisible()
  })

  test('tocar un ejercicio abre el menú de acciones con "Ver historial" primero', async ({ page }) => {
    await openSeededRoutine(page)
    await page.getByRole('heading', { name: 'Día Test' }).click()

    // El único h4 de la pantalla es el nombre del ejercicio dentro del día desplegado.
    await page.locator('h4').first().click()

    const sheet = page.locator('div.rounded-t-2xl').last()
    await expect(sheet.getByRole('button').first()).toHaveText('Ver historial')
    await expect(sheet.getByRole('button', { name: 'Eliminar' })).toBeVisible()
  })

  test('"Ver historial" abre el historial del ejercicio', async ({ page }) => {
    await openSeededRoutine(page)
    await page.getByRole('heading', { name: 'Día Test' }).click()

    // El ejercicio sembrado es el primero del catálogo, así que su nombre no es fijo: se lee de
    // la fila para poder reconocerlo luego en la cabecera del historial.
    const exerciseRow = page.locator('h4').first()
    const exerciseName = (await exerciseRow.textContent()).trim()
    await exerciseRow.click()

    const sheet = page.locator('div.rounded-t-2xl').last()
    await sheet.getByRole('button', { name: 'Ver historial' }).click()

    // El historial se monta solo al abrirlo: si el menú dejara de encenderlo, aquí no habría nada.
    await expect(page.getByRole('heading', { name: exerciseName, level: 3 })).toBeVisible({ timeout: 10000 })
    // Se abre con `routineDayId`, así que ofrece los dos ámbitos.
    await expect(page.getByRole('button', { name: 'Rutina' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Global' })).toBeVisible()
  })

  test('el asa de arrastre solo se pinta a partir de dos días', async ({ page }) => {
    await createEmptyRoutine(page)
    await page.getByRole('button', { name: 'Cancelar' }).click()

    const addDay = page.getByRole('button', { name: /añadir día/i })

    await addDay.click()
    await expect(page.getByRole('heading', { name: 'Día 1' })).toBeVisible()
    await expect(page.locator('svg.lucide-grip-vertical')).toHaveCount(0)

    await addDay.click()
    await expect(page.getByRole('heading', { name: 'Día 2' })).toBeVisible()
    await expect(page.locator('svg.lucide-grip-vertical')).toHaveCount(2)
  })
})

test.describe('Editar nombre y descripción', () => {
  test('un nombre vacío deja el error inline y el modal abierto; uno válido guarda y persiste', async ({ page }) => {
    await createEmptyRoutine(page)

    const nameInput = page.getByPlaceholder('Ej: Push Pull Legs')
    const saveButton = page.getByRole('button', { name: 'Guardar' })

    await nameInput.fill('   ')
    await saveButton.click()

    await expect(page.getByText('El nombre es obligatorio')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Editar nombre y descripción' })).toBeVisible()

    await nameInput.fill('Rutina renombrada E2E')
    await saveButton.click()

    await expect(page.getByRole('heading', { name: 'Editar nombre y descripción' })).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Rutina renombrada E2E' })).toBeVisible()

    // Al recargar sigue el nombre nuevo y el modal NO se reabre: la señal de apertura se
    // consume una vez y se limpia del state del historial.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Rutina renombrada E2E' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Editar nombre y descripción' })).toBeHidden()
  })

  test('cancelar descarta los cambios', async ({ page }) => {
    await createEmptyRoutine(page)

    await page.getByPlaceholder('Ej: Push Pull Legs').fill('Nombre descartado E2E')
    await page.getByRole('button', { name: 'Cancelar' }).click()

    await expect(page.getByRole('heading', { name: 'Editar nombre y descripción' })).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Mi rutina' })).toBeVisible()
  })
})
