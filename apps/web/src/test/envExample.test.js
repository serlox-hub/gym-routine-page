import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Toda env var que el código lee tiene que estar declarada en el `.env.example` de SU app: si no,
// quien clone el repo se encuentra una feature muerta sin ninguna pista de qué falta. Antes esto
// solo lo cazaba un grep del agente en la revisión; aquí es determinista y corre en CI.
// Vive en la suite de apps/web porque es el único runner de vitest del monorepo, pero comprueba
// las dos apps. Solo valida "usada ⇒ declarada": sobra-en-el-example es legítimo (app.json, EAS).
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

// Vite las inyecta siempre; no son configuración de nadie.
const VITE_BUILTINS = new Set(['DEV', 'PROD', 'MODE', 'BASE_URL', 'SSR'])

function sourceFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(js|jsx)$/.test(entry.name) ? [full] : []
  })
}

function usedVars(files, pattern, extraFiles = []) {
  const found = new Set()
  for (const file of [...files, ...extraFiles.filter(existsSync)]) {
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) found.add(match[1])
  }
  return [...found].sort()
}

const declaredVars = (envExample) =>
  new Set(
    readFileSync(envExample, 'utf8')
      .split('\n')
      .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
      .filter(Boolean)
  )

// Las que pone el entorno, no la config del proyecto.
const RUNTIME = new Set(['CI', 'NODE_ENV'])

const apps = [
  {
    name: 'web',
    used: usedVars(sourceFiles(join(repoRoot, 'apps/web/src')), /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g),
    envExample: join(repoRoot, 'apps/web/.env.example'),
    ignore: VITE_BUILTINS,
  },
  {
    // App.js está en la RAÍZ de la app, no en src/, y ahí se leen 4 de las 6 env vars native
    // (Sentry, GIFs y los dos client id de Google). Sin él el escaneo solo alcanza supabase.js.
    name: 'gym-native',
    used: usedVars(
      sourceFiles(join(repoRoot, 'apps/gym-native/src')),
      /process\.env\.(EXPO_PUBLIC_[A-Z0-9_]*)/g,
      [join(repoRoot, 'apps/gym-native/App.js')]
    ),
    envExample: join(repoRoot, 'apps/gym-native/.env.example'),
    ignore: new Set(),
  },
  {
    // Los e2e y sus scripts leen por `process.env` y viven fuera de todo src/, pero sus vars
    // (E2E_TEST_EMAIL/PASSWORD) se declaran en el .env.example de web como las demás.
    name: 'web (e2e y scripts)',
    used: usedVars(
      [...sourceFiles(join(repoRoot, 'apps/web/e2e')), ...sourceFiles(join(repoRoot, 'apps/web/scripts'))],
      /process\.env\.([A-Z][A-Z0-9_]*)/g,
      [join(repoRoot, 'apps/web/playwright.config.js')]
    ),
    envExample: join(repoRoot, 'apps/web/.env.example'),
    ignore: RUNTIME,
  },
]

describe('env vars declaradas en .env.example', () => {
  for (const { name, used, envExample, ignore } of apps) {
    it(`${name}: toda env var usada está en su .env.example`, () => {
      const declared = declaredVars(envExample)
      const missing = used.filter((v) => !ignore.has(v) && !declared.has(v))
      expect(missing).toEqual([])
    })
  }
})
