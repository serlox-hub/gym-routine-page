#!/usr/bin/env node
// La MISMA comparación que hace el CI desde #59 (`db:dump` + diff contra el snapshot commiteado),
// pero en local y antes de pushear, que es el hueco que nombra CLAUDE.md § Database Schema.
// Se compara el dump entero a propósito: un heurístico que solo mire nombres declarados no ve un
// cambio de tipo, un constraint sin nombre, un GRANT ni una policy modificada.
//
// NO hace `db reset`. En CI la comparación significa algo porque el paso anterior acaba de crear la
// BD desde las migraciones de la rama; aquí no hay esa precondición, así que se COMPRUEBA y, si no
// se cumple, se sale sin comparar. Resetear sería lo único equivalente a CI, pero mete ~30s en cada
// gate que toque BD.
//
// Hueco conocido que `migration list` NO detecta: una migración EDITADA después de aplicarse (misma
// versión, distinto contenido). Iterando pasa a menudo y solo un `db reset` lo cubre. CI sí lo caza.
import { execFileSync, spawnSync } from 'node:child_process'
import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// `git ls-files --others` imprime rutas relativas al CWD (a diferencia de `git diff --name-only`),
// así que todo se ancla a la raíz del repo y el script funciona se lance desde donde se lance.
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const WEB = join(ROOT, 'apps/web')
const SNAPSHOT = join(WEB, 'supabase/schema.sql')
const WATCHED = /^apps\/web\/supabase\/(migrations\/|schema\.sql$)/
const MAX_DIFF_LINES = 40

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', cwd: ROOT, ...opts })
const git = (args) => run('git', args).stdout.split('\n').filter(Boolean)

const touched = [
  ...git(['diff', '--name-only', 'HEAD', '--diff-filter=ACMR']),
  ...git(['ls-files', '--others', '--exclude-standard']),
].filter((f) => WATCHED.test(f))

if (touched.length === 0) {
  console.log('El diff no toca la BD: nada que comparar.')
  process.exit(0)
}

const skip = (reason) => {
  console.log(`SALTADO: ${reason}\nCI hace esta misma comparación, así que sigue habiendo red.`)
  process.exit(0)
}

// `supabase status` sale distinto de 0 si el stack no está arriba. `db:dump` es `--local`.
const status = run('npx', ['supabase', 'status'], { cwd: WEB })
if (status.status !== 0) {
  // Sin las GYM_SUPABASE_* el config no interpola y la CLI falla por parseo, no porque el stack
  // esté parado: decir "no está levantado" mandaría a levantar uno que ya está corriendo.
  const salida = `${status.stdout ?? ''}${status.stderr ?? ''}`
  skip(salida.includes('ProjectConfigParseError') || salida.includes('env_GYM_SUPABASE')
    ? 'faltan las variables `GYM_SUPABASE_*` que interpola `supabase/config.toml` (issue #63).\n' +
      'Cópialas de `apps/web/.env.example` a tu `.env` o `.env.local` de apps/web.'
    : 'el stack de Supabase local no está levantado, así que no hay BD contra la que comparar.\n' +
      'Para comprobarlo aquí: `npx supabase start` desde apps/web.')
}

// La comparación solo significa algo si la BD refleja EXACTAMENTE las migraciones del árbol.
// `local` vacío = migración aplicada que no está en este árbol: rama anterior de ESTE worktree, o
// un worktree al que no le diste su propio GYM_SUPABASE_PROJECT_ID y sigue con el de por defecto.
// `remote` vacío = migración del árbol sin aplicar (la que acabas de escribir: el caso que importa).
const listed = run('npx', ['supabase', 'migration', 'list', '--local', '--output-format', 'json'], { cwd: WEB })
const json = listed.stdout.split('\n').find((line) => line.startsWith('{"migrations"'))
if (listed.status !== 0 || !json) {
  skip('no se pudo leer el estado de las migraciones de la BD local.')
}

const desincronizadas = JSON.parse(json).migrations.filter((m) => !m.local || !m.remote)
if (desincronizadas.length > 0) {
  const sinAplicar = desincronizadas.filter((m) => !m.remote).map((m) => m.local)
  const ajenas = desincronizadas.filter((m) => !m.local).map((m) => m.remote)
  skip(
    'la BD local no está al día con las migraciones, así que compararla no diría nada.' +
    (sinAplicar.length ? `\n  Sin aplicar (están en el árbol): ${sinAplicar.join(', ')}` : '') +
    (ajenas.length ? `\n  Aplicadas pero ausentes del árbol: ${ajenas.join(', ')} (¿rama anterior de este worktree, o un worktree sin su propio GYM_SUPABASE_PROJECT_ID?)` : '') +
    '\n  Para comprobarlo aquí: `npm run db:schema` desde apps/web (⚠️ hace `db reset`).'
  )
}

const dumpPath = join(tmpdir(), `schema-gate-${process.pid}.sql`)
const dump = run('npm', ['run', 'db:dump', '--', dumpPath], { cwd: WEB })

if (dump.status !== 0) {
  console.error(`No se pudo volcar la BD local:\n${dump.stderr?.trim() ?? '(sin salida)'}`)
  process.exit(1)
}

const diff = run('diff', ['-u', SNAPSHOT, dumpPath])
try { unlinkSync(dumpPath) } catch { /* el tmp da igual si no se puede borrar */ }

if (diff.status === 0) {
  console.log('schema.sql coincide con la BD local, que tiene aplicadas todas las migraciones del árbol.')
  process.exit(0)
}

// Truncado: un esquema entero desincronizado son miles de líneas, y esta salida la lee un agente.
const lines = diff.stdout.split('\n')
console.error(`\nschema.sql NO coincide con el dump de las migraciones:\n`)
console.error(lines.slice(0, MAX_DIFF_LINES).join('\n'))
if (lines.length > MAX_DIFF_LINES) {
  console.error(`\n… y ${lines.length - MAX_DIFF_LINES} líneas más. Diff completo:`)
  console.error('  cd apps/web && npm run db:dump -- /tmp/schema.sql && diff -u supabase/schema.sql /tmp/schema.sql')
}
console.error(
  '\nRegenera el snapshot con `npm run db:schema` DESDE apps/web y commitéalo junto a la migración.\n' +
  'Si el diff no tiene relación con tu cambio, comprueba que tu CLI de Supabase es la misma versión\n' +
  'que fija package-lock.json: es quien elige la imagen que genera el dump.\n'
)
process.exit(1)
