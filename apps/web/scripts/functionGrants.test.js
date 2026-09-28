import { describe, it, expect } from 'vitest'
import { findGrantViolations } from './functionGrants.js'

const rpc = (overrides = {}) => ({
  name: 'duplicate_routine_day',
  signature: 'duplicate_routine_day(integer,text)',
  anon: false,
  authenticated: true,
  ...overrides,
})

const CLOSED_DEFAULT = ['postgres']

describe('findGrantViolations', () => {
  it('passes when anon cannot execute, authenticated can and the global default grants only postgres', () => {
    expect(findGrantViolations({ functions: [rpc()], defaultGrantees: CLOSED_DEFAULT })).toEqual([])
  })

  it('passes with no functions at all (json_agg over zero rows is null)', () => {
    expect(findGrantViolations({ functions: null, defaultGrantees: CLOSED_DEFAULT })).toEqual([])
  })

  it('fails naming the function when anon can execute it', () => {
    const violations = findGrantViolations({ functions: [rpc({ anon: true })], defaultGrantees: CLOSED_DEFAULT })
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('anon can execute duplicate_routine_day(integer,text)')
  })

  it('lets anon execute a function in the anon allow-list', () => {
    const helper = rpc({ name: 'is_admin', signature: 'is_admin(uuid)', anon: true })
    expect(findGrantViolations({ functions: [helper], defaultGrantees: CLOSED_DEFAULT })).toEqual([])
  })

  it('fails naming the function when authenticated cannot execute it', () => {
    const violations = findGrantViolations({ functions: [rpc({ authenticated: false })], defaultGrantees: CLOSED_DEFAULT })
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('authenticated cannot execute duplicate_routine_day(integer,text)')
  })

  it('reports both problems of the same function', () => {
    const violations = findGrantViolations({
      functions: [rpc({ anon: true, authenticated: false })],
      defaultGrantees: CLOSED_DEFAULT,
    })
    expect(violations).toHaveLength(2)
  })

  it('fails when the global default row for functions is missing', () => {
    const violations = findGrantViolations({ functions: [rpc()], defaultGrantees: null })
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('Missing the global default privileges')
  })

  it('passes when the global default row exists but grants nobody', () => {
    expect(findGrantViolations({ functions: [rpc()], defaultGrantees: [] })).toEqual([])
  })

  it('fails naming every grantee other than postgres in the global default', () => {
    const violations = findGrantViolations({
      functions: [rpc()],
      defaultGrantees: ['postgres', 'PUBLIC', 'anon'],
    })
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('grant EXECUTE to PUBLIC, anon')
  })
})
