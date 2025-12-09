import { test, expect } from '@playwright/test'

test.describe('Navegación básica', () => {
  test('carga la aplicación', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBe(200)
  })

  test('tiene título correcto', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/gym|rutina|tracker|vite/i)
  })

  test('rutas protegidas redirigen a login', async ({ page }) => {
    // La app usa autenticación, todas las rutas deberían mostrar login
    await page.goto('/routine/1')

    // Esperar a que cargue y verificar que muestra el formulario de login
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible({ timeout: 5000 })
  })

  test('página de login accesible directamente', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible()
  })

  test('página de signup accesible directamente', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByRole('heading', { name: /crear cuenta/i })).toBeVisible()
  })
})
