import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Cargar variables de entorno desde .env.local
config({ path: '.env.local' })

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global.teardown.js',
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
    // Setup project - hace login y guarda la sesión
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    // Tests que NO requieren autenticación
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/.*\.setup\.js/, /workout\.spec\.js/],
    },
    // Tests que SÍ requieren autenticación
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        // Usa el estado guardado por el setup
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /workout\.spec\.js/,
    },
  ],
  webServer: {
    command: 'npx vite --port 5174 --base /',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
  },
})
