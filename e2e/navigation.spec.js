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

  test('muestra contenido en español', async ({ page }) => {
    await page.goto('/')

    // Verificar que hay texto en español (el formulario de login)
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible()
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

test.describe('Responsive', () => {
  test('se adapta a móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // La app debería seguir siendo usable - verificar botón de login
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  })

  test('se adapta a tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  })

  test('se adapta a desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  })
})

test.describe('Accesibilidad básica', () => {
  test('inputs tienen labels asociados', async ({ page }) => {
    await page.goto('/login')

    // Verificar que los inputs existen
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()

    // Verificar que tienen labels con htmlFor
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="password"]')).toBeVisible()
  })

  test('formulario es navegable con teclado', async ({ page }) => {
    await page.goto('/login')

    // Focus en el primer input
    await page.locator('#email').focus()

    // Tab al siguiente input
    await page.keyboard.press('Tab')

    // Verificar que el focus se movió
    const focusedElement = await page.evaluate(() => document.activeElement?.id)
    expect(focusedElement).toBe('password')
  })

  test('tiene fondo oscuro (tema GitHub dark)', async ({ page }) => {
    await page.goto('/login')

    // Esperar a que cargue el contenido
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible()

    // Verificar que el contenedor principal tiene fondo oscuro
    const bgColor = await page.evaluate(() => {
      // Buscar el div que envuelve el login (tiene el fondo oscuro)
      const container = document.querySelector('[style*="background"]') || document.body
      const style = getComputedStyle(container)
      return style.backgroundColor
    })

    // El fondo debería ser oscuro (rgb bajo, valores cerca de 13)
    expect(bgColor).toMatch(/rgb\(\s*1[0-3],/)
  })
})
