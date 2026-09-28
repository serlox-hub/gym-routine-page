import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { findGrantViolations } from './functionGrants.js'
import { readLocalMigrationDrift } from './localMigrations.js'

// Checks who can execute the functions in `public` on the LOCAL database (issue #115). It exists
// because nothing else sees it: `db:dump` only dumps `public`, so schema.sql and the drift check miss
// the global default privileges, and no e2e calls the admin, feedback, unit conversion or day
// duplication RPCs. It answers only on a database that holds exactly the migrations of the tree
// (CI runs it right after `supabase start`; locally it refuses otherwise and asks for a reset).
const appDir = path.resolve(import.meta.dirname, '..')
const STACK_HINT = 'Is the stack up? `npx supabase start` from apps/web.'

// Trigger functions are not callable through the API, so they are left out.
const QUERY = `
SELECT
  (SELECT json_agg(json_build_object(
      'name', p.proname,
      'signature', p.oid::regprocedure::text,
      'anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ) ORDER BY p.proname)
   FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace
     AND p.prorettype <> 'trigger'::regtype) AS functions,
  (SELECT array(
      SELECT DISTINCT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee)::text END
      FROM aclexplode(d.defaclacl) a)
   FROM pg_default_acl d
   WHERE d.defaclrole = 'postgres'::regrole
     AND d.defaclnamespace = 0
     AND d.defaclobjtype = 'f') AS default_grantees
`

// With the new migration unapplied its function does not exist yet, so everything would pass.
const drift = readLocalMigrationDrift(appDir)
if (drift == null) {
  console.error(`Could not read the migrations of the local database. ${STACK_HINT}`)
  process.exit(1)
}
if (drift.unapplied.length > 0 || drift.foreign.length > 0) {
  console.error('The local database does not hold the migrations of this tree, so its grants say nothing about them.')
  if (drift.unapplied.length > 0) console.error(`  Not applied (in the tree): ${drift.unapplied.join(', ')}`)
  if (drift.foreign.length > 0) console.error(`  Applied but missing from the tree: ${drift.foreign.join(', ')}`)
  console.error('Rebuild it with `npx supabase db reset` from apps/web (it wipes the local database).')
  process.exit(1)
}

// `--agent no` pins the output shape. In agent mode (detected from env vars like CLAUDECODE) the CLI
// wraps the rows in `{ boundary, rows, warning }`; anywhere else, CI included, it prints the bare array.
const result = spawnSync(
  'npx',
  ['supabase', 'db', 'query', '--local', '--output-format', 'json', '--agent', 'no', QUERY],
  { cwd: appDir, encoding: 'utf8' }
)

if (result.status !== 0) {
  console.error(result.stderr?.trim() || '(no output)')
  console.error(`\nCould not query the local database. ${STACK_HINT}`)
  process.exit(1)
}

const [row] = JSON.parse(result.stdout)
const violations = findGrantViolations({ functions: row.functions, defaultGrantees: row.default_grantees })

if (violations.length > 0) {
  console.error(`\nFunction EXECUTE grants are wrong (${violations.length}):\n`)
  for (const violation of violations) console.error(`- ${violation}`)
  console.error('\nThe rule is in CLAUDE.md § Database Schema (Function EXECUTE).\n')
  process.exit(1)
}

console.log(`Function EXECUTE grants OK: ${row.functions?.length ?? 0} functions in public checked.`)
