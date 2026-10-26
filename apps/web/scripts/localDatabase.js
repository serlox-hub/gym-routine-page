import { spawnSync } from 'node:child_process'
import { readLocalMigrationDrift } from './localMigrations.js'

// Queries the LOCAL database for a check that reads what the migrations created (function grants,
// PR rule parity). It answers only on a database that holds exactly the migrations of the tree:
// with the migration you just wrote still unapplied, what it creates does not exist yet and the
// check would pass. CI runs these checks right after `supabase start`; locally they refuse
// otherwise and ask for a reset.
const STACK_HINT = 'Is the stack up? `npx supabase start` from apps/web.'

/**
 * @param {string} webDir apps/web, where supabase/config.toml lives.
 * @param {string} sql
 * @returns {object[]} The rows.
 * @throws {Error} With a message for a person when the database cannot answer for this tree.
 */
export function queryLocalDatabase(webDir, sql) {
  const drift = readLocalMigrationDrift(webDir)
  if (drift == null) {
    throw new Error(`Could not read the migrations of the local database. ${STACK_HINT}`)
  }
  if (drift.unapplied.length > 0 || drift.foreign.length > 0) {
    throw new Error([
      'The local database does not hold the migrations of this tree, so a check on it says nothing about them.',
      ...(drift.unapplied.length > 0 ? [`  Not applied (in the tree): ${drift.unapplied.join(', ')}`] : []),
      ...(drift.foreign.length > 0 ? [`  Applied but missing from the tree: ${drift.foreign.join(', ')}`] : []),
      'Rebuild it with `npx supabase db reset` from apps/web (it wipes the local database).',
    ].join('\n'))
  }

  // `--agent no` pins the output shape. In agent mode (detected from env vars like CLAUDECODE) the CLI
  // wraps the rows in `{ boundary, rows, warning }`; anywhere else, CI included, it prints the bare array.
  const result = spawnSync(
    'npx',
    ['supabase', 'db', 'query', '--local', '--output-format', 'json', '--agent', 'no', sql],
    { cwd: webDir, encoding: 'utf8' }
  )
  if (result.status !== 0) {
    throw new Error(`${result.stderr?.trim() || '(no output)'}\n\nCould not query the local database. ${STACK_HINT}`)
  }
  return JSON.parse(result.stdout)
}
