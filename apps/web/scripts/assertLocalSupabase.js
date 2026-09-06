import './loadEnv.js'

// Los e2e escriben de verdad (rutinas, sesiones, series, peso corporal) y no limpian nada detrás:
// la BD es efímera y `npm run test:e2e` la reconstruye entera antes de cada ejecución. Apuntarlos
// al proyecto remoto dejaría esa basura en producción para siempre, así que se corta aquí en vez
// de confiar en que nadie lo haga.
//
// Vive en su propio archivo, y no dentro de playwright.config.js, porque tiene que correr ANTES
// del `supabase db reset` del script (de ahí el `pretest:e2e`): si no, quien tenga el `.env`
// apuntando al remoto se come el reset antes de que nadie le diga que su configuración es la
// equivocada, y quien además no tenga el stack levantado solo ve un "supabase start is not
// running" que no menciona el `.env` por ningún lado. playwright.config.js lo importa para cubrir
// también un `playwright test` lanzado a pelo.
const url = process.env.VITE_SUPABASE_URL || ''

if (!/^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(url)) {
  console.error(
    `\nLos e2e solo corren contra la Supabase LOCAL, y VITE_SUPABASE_URL apunta a "${url}".\n` +
    'Levántala con `npx supabase start` desde apps/web y crea un .env.local con los valores.\n' +
    'Están literales en apps/web/.env.example. NO toques tu .env: es la capa de debajo, con el\n' +
    'proyecto remoto, y volver a él es tan simple como renombrar el .env.local.\n'
  )
  process.exit(1)
}

// Host local no basta desde que cada worktree levanta SU stack (issue #63): el `db reset` de abajo
// reconstruye el stack que dice `config.toml` (GYM_SUPABASE_API_PORT), pero Playwright escribe
// contra el que dice esta URL. Si no coinciden, reseteas tu BD vacía y ensucias la de OTRO
// worktree, sin un solo error. Solo se comprueba si la variable está definida: sin ella no hay
// stack propio que proteger.
const apiPort = process.env.GYM_SUPABASE_API_PORT
const urlPort = url.match(/^https?:\/\/[^:/]+:(\d+)/)?.[1]

if (apiPort && urlPort && urlPort !== apiPort) {
  console.error(
    `\nVITE_SUPABASE_URL apunta al puerto ${urlPort}, pero el stack de este worktree es el ${apiPort}\n` +
    `(GYM_SUPABASE_API_PORT). Los e2e resetearían el ${apiPort} y escribirían en el ${urlPort}, que es\n` +
    'la BD de otro worktree. Pon el puerto de tu stack en VITE_SUPABASE_URL, en el mismo .env.local\n' +
    'donde tienes las GYM_SUPABASE_*.\n'
  )
  process.exit(1)
}
