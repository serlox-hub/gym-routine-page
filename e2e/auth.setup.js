import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(import.meta.dirname, '../.auth/user.json')

/**
 * Este setup hace login con el usuario de test y guarda la sesión
 * para reutilizarla en los tests que requieren autenticación.
 *
 * Configura las variables de entorno:
 * - E2E_TEST_EMAIL: email del usuario de test
 * - E2E_TEST_PASSWORD: contraseña del usuario de test
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Faltan variables de entorno E2E_TEST_EMAIL y E2E_TEST_PASSWORD.\n' +
      'Crea un archivo .env.local con las credenciales del usuario de test.'
    )
  }

  await page.goto('/login')

  // Rellenar formulario de login
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  // Esperar a que redirija a la home (indica login exitoso)
  await expect(page).toHaveURL('/', { timeout: 10000 })

  // Guardar el estado de autenticación
  await page.context().storageState({ path: authFile })
})
