import { spawnSync } from 'node:child_process'

// Whether the LOCAL database holds exactly the migrations of the tree. Any check that reads that
// database (schema drift, function grants) only means something when it does: with the migration
// you just wrote still unapplied, whatever it creates does not exist yet and the check passes.
// Shared by scripts/checkSchemaDrift.mjs (root) and checkFunctionGrants.js.
//
// Known gap: a migration EDITED after being applied (same version, other content) looks in sync.
// Only a `db reset` covers it. CI builds the database from scratch, so it does not have the gap.

/**
 * @param {string | null | undefined} stdout Output of `supabase migration list --local --output-format json`.
 * @returns {{ unapplied: string[], foreign: string[] } | null} `unapplied`: in the tree, not in the
 *   database (the migration you just wrote). `foreign`: in the database, not in the tree (a previous
 *   branch of this worktree, or a worktree still sharing the default GYM_SUPABASE_PROJECT_ID). null
 *   when the output carries no migration list.
 */
export function findMigrationDrift(stdout) {
  // The CLI may print other lines around the JSON (an update notice, a config warning).
  const json = stdout?.split('\n').find((line) => line.startsWith('{"migrations"'))
  if (!json) return null

  const { migrations } = JSON.parse(json)
  return {
    unapplied: migrations.filter((migration) => !migration.remote).map((migration) => migration.local),
    foreign: migrations.filter((migration) => !migration.local).map((migration) => migration.remote),
  }
}

/**
 * Asks the local stack. Same contract as findMigrationDrift, and null too when the command fails.
 * @param {string} webDir apps/web, where supabase/config.toml lives.
 */
export function readLocalMigrationDrift(webDir) {
  const listed = spawnSync(
    'npx',
    ['supabase', 'migration', 'list', '--local', '--output-format', 'json'],
    { cwd: webDir, encoding: 'utf8' }
  )
  if (listed.status !== 0) return null
  return findMigrationDrift(listed.stdout)
}
