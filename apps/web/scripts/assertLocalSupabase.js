import { config } from 'dotenv'

// Mismo .env que playwright.config.js. Los valores que ya vengan del entorno ganan (dotenv no
// sobreescribe), que es como el CI inyecta los de su instancia efímera.
config({ path: '.env' })

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
    'Levántala con `npx supabase start` desde apps/web y copia sus credenciales en .env\n' +
    '(las imprime `npx supabase status -o env`). Ver apps/web/.env.example.\n'
  )
  process.exit(1)
}
