import { defineConfig, devices } from '@playwright/test'
// Cargar variables de entorno (.env.local gana sobre .env, como en Vite)
import './scripts/loadEnv.js'
// Aborta si VITE_SUPABASE_URL no es la Supabase local (el porqué, en el propio archivo). En
// `npm run test:e2e` esto ya ha corrido vía `pretest:e2e`; el import cubre un `playwright test`
// lanzado a pelo.
import './scripts/assertLocalSupabase.js'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup de autenticación - hace login y guarda la sesión
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.js/,
    },
    // Setup de datos - crea rutina de test
    {
      name: 'data-setup',
      testMatch: /testData\.setup\.js/,
      dependencies: ['auth-setup'],
    },
    // Tests que NO requieren autenticación
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/.*\.setup\.js/, /(workout|completeSet|createRoutine|routineIO|exercises|bodyWeight|session)\.spec\.js/],
    },
    // Tests que SÍ requieren autenticación
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        // Usa el estado guardado por el setup
        storageState: '.auth/user.json',
      },
      dependencies: ['data-setup'],
      testMatch: /(workout|completeSet|createRoutine|routineIO|exercises|bodyWeight|session)\.spec\.js/,
    },
  ],
  webServer: {
    command: 'npx vite --port 5174 --base /',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
  },
})
