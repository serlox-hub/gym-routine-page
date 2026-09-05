import path from 'path'
import { config } from 'dotenv'

// Precedencia de Vite para los DOS archivos que usa este repo: `.env.local` (no versionado,
// config de tu máquina) gana sobre `.env`. Los de modo (`.env.development[.local]`) NO se leen
// aquí a propósito: la cadena de los e2e corre en un único modo.
//
// El orden ES la implementación: dotenv NO pisa lo que ya está cargado, así que manda el PRIMERO
// que se lee. Invertir estas dos líneas deja `.env.local` sin efecto y no falla por ningún lado.
//
// Por encima de los dos gana lo que venga del entorno, que es como el CI inyecta la URL y la
// anon key de su instancia efímera sin tener ningún archivo.
//
// Existe porque la cadena de los e2e corre fuera de Vite (guard, playwright.config, setups) y
// tiene que ver exactamente las mismas variables que el dev server al que lanza los tests. Por eso
// las rutas se resuelven contra apps/web y no contra el cwd: Vite las resuelve contra su envDir
// (el directorio del vite.config.js) da igual desde dónde lo lances, y esto tiene que hacer lo
// mismo o deja de ver lo que ve el dev server.
const appDir = path.resolve(import.meta.dirname, '..')

config({ path: path.join(appDir, '.env.local') })
config({ path: path.join(appDir, '.env') })
