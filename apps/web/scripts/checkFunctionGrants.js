import path from 'node:path'
import { findGrantViolations } from './functionGrants.js'
import { queryLocalDatabase } from './localDatabase.js'

// Checks who can execute the functions in `public` on the LOCAL database (issue #115). It exists
// because nothing else sees it: `db:dump` only dumps `public`, so schema.sql and the drift check miss
// the global default privileges, and no e2e calls the admin, feedback, unit conversion or day
// duplication RPCs. Like every check through queryLocalDatabase, it answers only on a database that
// holds exactly the migrations of the tree.
const appDir = path.resolve(import.meta.dirname, '..')

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

let rows
try {
  rows = queryLocalDatabase(appDir, QUERY)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

const [row] = rows

const violations = findGrantViolations({ functions: row.functions, defaultGrantees: row.default_grantees })

if (violations.length > 0) {
  console.error(`\nFunction EXECUTE grants are wrong (${violations.length}):\n`)
  for (const violation of violations) console.error(`- ${violation}`)
  console.error('\nThe rule is in CLAUDE.md § Database Schema (Function EXECUTE).\n')
  process.exit(1)
}

console.log(`Function EXECUTE grants OK: ${row.functions?.length ?? 0} functions in public checked.`)
