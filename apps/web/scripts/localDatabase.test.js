import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { queryLocalDatabase } from './localDatabase.js'

// A Node builtin also needs its `default` export, which vitest looks up when a module imports it.
vi.mock('node:child_process', () => {
  const spawnSync = vi.fn()
  return { spawnSync, default: { spawnSync } }
})

const WEB_DIR = '/repo/apps/web'
const SQL = 'SELECT 1 AS one'

const migrationList = (migrations) => ({ status: 0, stdout: JSON.stringify({ migrations }), stderr: '' })
const IN_SYNC = migrationList([{ local: '071', remote: '071', time: '071' }])

// The CLI is the only boundary: `migration list` answers what the database holds, `db query` answers
// the rows. Both go through spawnSync, so a fake that tells them apart by the subcommand is enough.
function fakeCli({ list, query }) {
  spawnSync.mockImplementation((_command, args) => (args[1] === 'migration' ? list : query))
}

const queryCalls = () => spawnSync.mock.calls.filter(([, args]) => args[1] === 'db')

describe('queryLocalDatabase', () => {
  beforeEach(() => {
    spawnSync.mockReset()
  })

  it('returns the rows when the database holds exactly the migrations of the tree', () => {
    fakeCli({ list: IN_SYNC, query: { status: 0, stdout: '[{"one":1}]', stderr: '' } })

    expect(queryLocalDatabase(WEB_DIR, SQL)).toEqual([{ one: 1 }])
  })

  it('sends the SQL to the local database from the web dir, with the output shape pinned', () => {
    fakeCli({ list: IN_SYNC, query: { status: 0, stdout: '[]', stderr: '' } })

    queryLocalDatabase(WEB_DIR, SQL)

    const [[, args, options]] = queryCalls()
    expect(args).toContain('--local')
    expect(args.join(' ')).toContain('--agent no')
    expect(args.at(-1)).toBe(SQL)
    expect(options.cwd).toBe(WEB_DIR)
  })

  it('refuses a migration of the tree the database has not applied, and does not run the query', () => {
    fakeCli({
      list: migrationList([
        { local: '071', remote: '071', time: '071' },
        { local: '072', remote: '', time: '072' },
      ]),
      query: { status: 0, stdout: '[]', stderr: '' },
    })

    expect(() => queryLocalDatabase(WEB_DIR, SQL)).toThrow(/Not applied \(in the tree\): 072/)
    expect(queryCalls()).toHaveLength(0)
  })

  it('refuses a migration the database has applied that the tree does not have', () => {
    fakeCli({
      list: migrationList([
        { local: '071', remote: '071', time: '071' },
        { local: '', remote: '099', time: '099' },
      ]),
      query: { status: 0, stdout: '[]', stderr: '' },
    })

    expect(() => queryLocalDatabase(WEB_DIR, SQL)).toThrow(/Applied but missing from the tree: 099/)
    expect(queryCalls()).toHaveLength(0)
  })

  it('names both kinds of drift and says how to rebuild the database', () => {
    fakeCli({
      list: migrationList([
        { local: '', remote: '099', time: '099' },
        { local: '072', remote: '', time: '072' },
      ]),
      query: { status: 0, stdout: '[]', stderr: '' },
    })

    expect(() => queryLocalDatabase(WEB_DIR, SQL)).toThrow(
      /Not applied \(in the tree\): 072[\s\S]*Applied but missing from the tree: 099[\s\S]*supabase db reset/
    )
  })

  it('does not name a kind of drift that is not there', () => {
    fakeCli({
      list: migrationList([{ local: '072', remote: '', time: '072' }]),
      query: { status: 0, stdout: '[]', stderr: '' },
    })

    expect(() => queryLocalDatabase(WEB_DIR, SQL)).toThrow(/^(?![\s\S]*Applied but missing)/)
  })

  it('asks whether the stack is up when the migrations cannot be read, and does not run the query', () => {
    fakeCli({
      list: { status: 1, stdout: '', stderr: 'connection refused' },
      query: { status: 0, stdout: '[]', stderr: '' },
    })

    expect(() => queryLocalDatabase(WEB_DIR, SQL)).toThrow(/Is the stack up\?/)
    expect(queryCalls()).toHaveLength(0)
  })

  it('treats a migration list the CLI printed without the JSON line as unreadable', () => {
    fakeCli({
      list: { status: 0, stdout: 'Error: could not connect\n', stderr: '' },
      query: { status: 0, stdout: '[]', stderr: '' },
    })

    expect(() => queryLocalDatabase(WEB_DIR, SQL)).toThrow(/Could not read the migrations/)
  })

  it('reports the CLI error and the stack hint when the query fails', () => {
    fakeCli({ list: IN_SYNC, query: { status: 1, stdout: '', stderr: '  relation "nope" does not exist \n' } })

    expect(() => queryLocalDatabase(WEB_DIR, SQL)).toThrow(/relation "nope" does not exist[\s\S]*Is the stack up\?/)
  })

  it('still explains a failed query that printed nothing', () => {
    fakeCli({ list: IN_SYNC, query: { status: 1, stdout: '', stderr: '' } })

    expect(() => queryLocalDatabase(WEB_DIR, SQL)).toThrow(/\(no output\)[\s\S]*Is the stack up\?/)
  })
})
