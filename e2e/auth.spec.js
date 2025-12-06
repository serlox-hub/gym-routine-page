import { test, expect } from '@playwright/test'

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('redirige a login si no está autenticado', async ({ page }) => {
    await expect(page).toHaveURL(/\/login/)
  })

  test('muestra formulario de login', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  })

  test('muestra link para crear cuenta', async ({ page }) => {
    await expect(page.getByRole('link', { name: /regístrate/i })).toBeVisible()
  })

  test('navega a signup desde login', async ({ page }) => {
    await page.getByRole('link', { name: /regístrate/i }).click()
    await expect(page).toHaveURL(/\/signup/)
    await expect(page.getByRole('heading', { name: /crear cuenta/i })).toBeVisible()
  })

  test('muestra formulario de signup', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()
    await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible()
  })

  test('valida campos vacíos en login', async ({ page }) => {
    await page.getByRole('button', { name: /entrar/i }).click()

    // Debería mostrar error de validación
    await expect(page.getByText(/completa todos los campos/i)).toBeVisible()
  })

  test('valida campos vacíos en signup', async ({ page }) => {
    await page.goto('/signup')
    await page.getByRole('button', { name: /crear cuenta/i }).click()

    await expect(page.getByText(/completa todos los campos/i)).toBeVisible()
  })

  test('valida email inválido en signup', async ({ page }) => {
    await page.goto('/signup')

    await page.locator('#email').fill('invalidemail')
    await page.locator('#password').fill('password123')
    await page.locator('#confirmPassword').fill('password123')
    await page.getByRole('button', { name: /crear cuenta/i }).click()

    // El navegador muestra validación HTML5 nativa para type="email"
    // Verificamos que el input tiene el mensaje de validación del navegador
    const emailInput = page.locator('#email')
    const validationMessage = await emailInput.evaluate((el) => el.validationMessage)
    expect(validationMessage).toBeTruthy()
  })

  test('valida contraseña corta en signup', async ({ page }) => {
    await page.goto('/signup')

    await page.locator('#email').fill('test@example.com')
    await page.locator('#password').fill('12345')
    await page.locator('#confirmPassword').fill('12345')
    await page.getByRole('button', { name: /crear cuenta/i }).click()

    await expect(page.getByText(/6 caracteres/i)).toBeVisible()
  })

  test('valida contraseñas no coinciden en signup', async ({ page }) => {
    await page.goto('/signup')

    await page.locator('#email').fill('test@example.com')
    await page.locator('#password').fill('password123')
    await page.locator('#confirmPassword').fill('different123')
    await page.getByRole('button', { name: /crear cuenta/i }).click()

    await expect(page.getByText(/no coinciden/i)).toBeVisible()
  })

  test('navega a login desde signup', async ({ page }) => {
    await page.goto('/signup')
    await page.getByRole('link', { name: /inicia sesión/i }).click()

    await expect(page).toHaveURL(/\/login/)
  })
})
