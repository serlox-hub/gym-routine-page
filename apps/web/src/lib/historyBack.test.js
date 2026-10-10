import { describe, it, expect, afterEach, vi } from 'vitest'
import { hasAppHistoryBehind, goBack } from './historyBack.js'

describe('hasAppHistoryBehind', () => {
  afterEach(() => window.history.replaceState(null, ''))

  it('is false without router state', () => {
    window.history.replaceState(null, '')
    expect(hasAppHistoryBehind()).toBe(false)
  })

  it('is false on the first app entry', () => {
    window.history.replaceState({ idx: 0 }, '')
    expect(hasAppHistoryBehind()).toBe(false)
  })

  it('is true with an app entry behind', () => {
    window.history.replaceState({ idx: 2 }, '')
    expect(hasAppHistoryBehind()).toBe(true)
  })
})

describe('goBack', () => {
  afterEach(() => window.history.replaceState(null, ''))

  it('goes back when there is an app entry behind', () => {
    window.history.replaceState({ idx: 1 }, '')
    const navigate = vi.fn()
    goBack(navigate, '/routines')
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('replaces with the fallback on the first app entry', () => {
    window.history.replaceState({ idx: 0 }, '')
    const navigate = vi.fn()
    goBack(navigate, '/routines')
    expect(navigate).toHaveBeenCalledWith('/routines', { replace: true })
  })
})
