import { defineConfig } from 'vitest/config'

// Cobertura de la lógica compartida (issue #20, G3). Config PROPIO del paquete (no el de apps/web)
// a propósito: así `src` es el root y v8 sí instrumenta los archivos (desde apps/web quedaban
// fuera de root y coverage reportaba 0). Solo lib/ y api/ (lógica pura, entorno `node`, sin
// React/jsdom); los tests de hooks/ (React) siguen corriendo en apps/web. Umbral = SUELO actual
// (algo por debajo de lo medido) para que la cobertura no baje sin querer; súbelo al mejorarla.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/**/*.test.js', 'src/api/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/api/**'],
      // Barrels (index.js, *Api.js re-export), inyectores (_client/_stores) y helpers de test no
      // tienen lógica propia que testear.
      exclude: ['**/*.test.js', '**/index.js', '**/_*.js', 'src/api/workoutApi.js'],
      all: true,
      reporter: ['text-summary'],
      // Suelo ~2-3 pts por debajo de lo medido (2026-08: L 87.0 / S 84.9 / F 85.1 / B 78.9).
      // Margen para no romper CI por fluctuaciones; sube estos números al mejorar cobertura.
      thresholds: { lines: 85, statements: 83, functions: 83, branches: 76 },
    },
  },
})
