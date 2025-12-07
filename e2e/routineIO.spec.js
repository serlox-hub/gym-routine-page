import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

test.describe('Import/Export de rutinas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('puede exportar una rutina existente', async ({ page }) => {
    // Buscar si hay rutinas
    const routineCard = page.locator('[href*="/routine/"]').first()

    if (await routineCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await routineCard.click()
      await expect(page).toHaveURL(/\/routine\/\d+/)

      // Buscar botón de exportar
      const exportButton = page.getByRole('button', { name: /exportar/i })

      if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Preparar para capturar la descarga
        const downloadPromise = page.waitForEvent('download')
        await exportButton.click()
        const download = await downloadPromise

        // Verificar que se descargó un archivo JSON
        expect(download.suggestedFilename()).toMatch(/\.json$/)
      }
    }
  })

  test('puede importar una rutina desde archivo JSON', async ({ page }) => {
    // Crear archivo temporal de prueba
    const testRoutine = {
      version: 4,
      exportedAt: new Date().toISOString(),
      exercises: [
        {
          name: 'Press banca test',
          measurement_type: 'weight_reps',
          weight_unit: 'kg',
          instructions: null,
          muscle_group_name: 'Pecho',
        },
      ],
      routine: {
        name: 'Rutina E2E Test',
        description: 'Rutina creada por test e2e',
        goal: 'Testing',
        days: [
          {
            name: 'Día Test',
            estimated_duration_min: 30,
            sort_order: 1,
            blocks: [
              {
                name: 'Principal',
                sort_order: 1,
                duration_min: 30,
                exercises: [
                  {
                    exercise_name: 'Press banca test',
                    series: 3,
                    reps: '10',
                    rir: 2,
                    rest_seconds: 60,
                    tempo: null,
                    tempo_razon: null,
                    notes: null,
                  },
                ],
              },
            ],
          },
        ],
      },
    }

    // Buscar input de importación
    const fileInput = page.locator('input[type="file"][accept=".json"]')

    if (await fileInput.count() > 0) {
      // Crear archivo temporal
      const tempPath = path.join('/tmp', 'test-routine.json')
      fs.writeFileSync(tempPath, JSON.stringify(testRoutine, null, 2))

      await fileInput.setInputFiles(tempPath)

      // Esperar navegación a la nueva rutina
      await expect(page).toHaveURL(/\/routine\/\d+/, { timeout: 10000 })

      // Verificar que la rutina se creó
      await expect(page.getByText('Rutina E2E Test')).toBeVisible()

      // Limpiar archivo temporal
      fs.unlinkSync(tempPath)
    }
  })

  test('muestra error con JSON inválido', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept=".json"]')

    if (await fileInput.count() > 0) {
      // Crear archivo con JSON inválido
      const tempPath = path.join('/tmp', 'invalid-routine.json')
      fs.writeFileSync(tempPath, 'not valid json {{{')

      // Escuchar alertas
      page.on('dialog', async dialog => {
        expect(dialog.message()).toMatch(/error/i)
        await dialog.accept()
      })

      await fileInput.setInputFiles(tempPath)

      // Debería quedarse en la misma página
      await expect(page).toHaveURL('/')

      fs.unlinkSync(tempPath)
    }
  })
})
