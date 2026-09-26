import { test, expect } from '@playwright/test'

// Arrastre para reordenar ejercicios de un día (issue #88), sobre el día sembrado por
// `testData.setup.js` con una superserie: E2E Uno · (E2E Dos + E2E Tres) · E2E Cuatro.
const ROUTINE_NAME = 'Rutina Superset E2E'
const DAY_NAME = 'Día Superset E2E'
const INITIAL_ORDER = ['E2E Uno', 'E2E Dos', 'E2E Tres', 'E2E Cuatro']

function block(page) {
  return page.locator('section').filter({ hasText: 'Principal' })
}

/** Nombres de los ejercicios del bloque, en el orden en el que se pintan. */
function exerciseNames(page) {
  return block(page).locator('h4')
}

function exerciseRow(page, name) {
  return page.locator('div.cursor-pointer').filter({ has: page.getByRole('heading', { level: 4, name }) })
}

/** El asa es el único botón de la fila. */
function exerciseHandle(page, name) {
  return exerciseRow(page, name).locator('button')
}

/** El asa de la cabecera morada, hermana de su etiqueta. */
function supersetHandle(page) {
  return page.getByText('Superset A').locator('xpath=..').locator('button')
}

async function openSupersetDay(page) {
  await page.goto('/routines')
  const card = page.getByText(ROUTINE_NAME, { exact: true }).first()
  await expect(card).toBeVisible({ timeout: 10000 })
  await card.click()
  await expect(page).toHaveURL(/\/routine\/\d+$/)
  await expandDay(page)
}

async function expandDay(page) {
  await page.getByRole('heading', { name: DAY_NAME }).click()
  await expect(exerciseNames(page).first()).toBeVisible({ timeout: 10000 })
}

/**
 * Arrastra el asa hasta `targetY` en varios pasos: dnd-kit pide recorrido para activar el gesto y
 * recalcula la colisión en cada movimiento, así que un salto único no reordenaría nada.
 */
async function dragHandleTo(page, handle, targetY) {
  const box = await handle.boundingBox()
  const x = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await page.mouse.move(x, startY)
  await page.mouse.down()
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, startY + ((targetY - startY) * i) / steps)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

/** Y por debajo del centro de la fila `name`: soltar ahí la deja por detrás. */
async function belowRow(page, name) {
  const box = await exerciseRow(page, name).boundingBox()
  return box.y + box.height
}

test.describe('Reordenar ejercicios por arrastre', () => {
  test('arrastra un ejercicio y una superserie completa, y el orden persiste', async ({ page }) => {
    await openSupersetDay(page)
    await expect(exerciseNames(page)).toHaveText(INITIAL_ORDER)
    await expect(page.getByText('Superset A')).toHaveCount(1)

    // Criterio 1: un individual hasta el final del bloque, por su propia asa.
    await dragHandleTo(page, exerciseHandle(page, 'E2E Uno'), await belowRow(page, 'E2E Cuatro'))
    const afterFirstDrag = ['E2E Dos', 'E2E Tres', 'E2E Cuatro', 'E2E Uno']
    await expect(exerciseNames(page)).toHaveText(afterFirstDrag)

    await page.reload()
    await expandDay(page)
    await expect(exerciseNames(page)).toHaveText(afterFirstDrag)

    // Criterio 2: la superserie entera desde el asa de su cabecera. Sus miembros se pliegan
    // mientras viaja, y al soltarla sigue siendo UNA sola tarjeta morada.
    await dragHandleTo(page, supersetHandle(page), await belowRow(page, 'E2E Uno'))
    const afterSecondDrag = ['E2E Cuatro', 'E2E Uno', 'E2E Dos', 'E2E Tres']
    await expect(exerciseNames(page)).toHaveText(afterSecondDrag)
    await expect(page.getByText('Superset A')).toHaveCount(1)

    await page.reload()
    await expandDay(page)
    await expect(exerciseNames(page)).toHaveText(afterSecondDrag)
    await expect(page.getByText('Superset A')).toHaveCount(1)
  })
})
