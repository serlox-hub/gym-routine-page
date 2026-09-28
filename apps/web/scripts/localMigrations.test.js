import { describe, it, expect } from 'vitest'
import { findMigrationDrift } from './localMigrations.js'

const migrationsJson = (migrations) => JSON.stringify({ migrations })

describe('findMigrationDrift', () => {
  it('returns empty lists when every migration is applied on both sides', () => {
    const stdout = migrationsJson([
      { local: '001', remote: '001', time: '001' },
      { local: '002', remote: '002', time: '002' },
    ])
    expect(findMigrationDrift(stdout)).toEqual({ unapplied: [], foreign: [] })
  })

  it('reports an unapplied migration (in the tree, remote empty)', () => {
    const stdout = migrationsJson([
      { local: '001', remote: '001', time: '001' },
      { local: '066', remote: '', time: '066' },
    ])
    expect(findMigrationDrift(stdout)).toEqual({ unapplied: ['066'], foreign: [] })
  })

  it('reports a foreign migration (in the database, local empty)', () => {
    const stdout = migrationsJson([
      { local: '001', remote: '001', time: '001' },
      { local: '', remote: '050', time: '050' },
    ])
    expect(findMigrationDrift(stdout)).toEqual({ unapplied: [], foreign: ['050'] })
  })

  it('reports both unapplied and foreign migrations at once', () => {
    const stdout = migrationsJson([
      { local: '', remote: '050', time: '050' },
      { local: '066', remote: '', time: '066' },
    ])
    expect(findMigrationDrift(stdout)).toEqual({ unapplied: ['066'], foreign: ['050'] })
  })

  it('returns empty lists for an empty migration history', () => {
    expect(findMigrationDrift(migrationsJson([]))).toEqual({ unapplied: [], foreign: [] })
  })

  it('finds the JSON line among other CLI output, such as an update notice', () => {
    const stdout = [
      'A new version of Supabase CLI is available.',
      migrationsJson([{ local: '066', remote: '', time: '066' }]),
      '',
    ].join('\n')
    expect(findMigrationDrift(stdout)).toEqual({ unapplied: ['066'], foreign: [] })
  })

  it('returns null when the output carries no migration list', () => {
    expect(findMigrationDrift('Error: could not connect to the database\n')).toBeNull()
  })

  it('returns null for null or undefined stdout', () => {
    expect(findMigrationDrift(null)).toBeNull()
    expect(findMigrationDrift(undefined)).toBeNull()
  })
})
