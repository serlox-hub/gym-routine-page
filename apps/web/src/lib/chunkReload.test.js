import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as Sentry from '@sentry/react'
import { CHUNK_RELOAD_COOLDOWN_MS, isChunkLoadError, reloadOnce, reportChunkReload } from './chunkReload.js'

vi.mock('@sentry/react', () => ({ captureMessage: vi.fn() }))

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

const throwingStorage = {
  getItem: () => { throw new Error('SecurityError') },
  setItem: () => { throw new Error('SecurityError') },
  removeItem: () => { throw new Error('SecurityError') },
}

describe('isChunkLoadError', () => {
  it.each([
    ['Chromium', new TypeError('Failed to fetch dynamically imported module: https://app.test/assets/Home-abc123.js')],
    ['WebKit', new TypeError('Importing a module script failed.')],
    ['Firefox', new TypeError('error loading dynamically imported module: https://app.test/assets/Home-abc123.js')],
  ])('recognises the %s message', (_, error) => {
    expect(isChunkLoadError(error)).toBe(true)
  })

  it('recognises an error named ChunkLoadError', () => {
    const error = new Error('Loading chunk 7 failed.')
    error.name = 'ChunkLoadError'
    expect(isChunkLoadError(error)).toBe(true)
  })

  it.each([
    ['a generic Error', new Error('Cannot read properties of undefined')],
    ['a TypeError', new TypeError('x')],
    ['null', null],
    ['undefined', undefined],
    ['a string with the message', 'Importing a module script failed.'],
    ['a plain object with the message', { message: 'Importing a module script failed.' }],
  ])('is false for %s', (_, error) => {
    expect(isChunkLoadError(error)).toBe(false)
  })
})

describe('reloadOnce', () => {
  const START = 1_767_225_600_000

  it('reloads the first time and marks the reload as pending', () => {
    const storage = createStorage()
    const reload = vi.fn()

    expect(reloadOnce({ now: START, storage, reload })).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(storage.getItem('chunk-reload-pending')).toBe('1')
  })

  it('does not reload again within the cooldown', () => {
    const storage = createStorage()
    const reload = vi.fn()
    reloadOnce({ now: START, storage, reload })

    expect(reloadOnce({ now: START + CHUNK_RELOAD_COOLDOWN_MS - 1, storage, reload })).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again once the cooldown is over', () => {
    const storage = createStorage()
    const reload = vi.fn()
    reloadOnce({ now: START, storage, reload })

    expect(reloadOnce({ now: START + CHUNK_RELOAD_COOLDOWN_MS, storage, reload })).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('reloads when the stored time is not a number', () => {
    const storage = createStorage()
    storage.setItem('chunk-reload-at', 'oops')
    const reload = vi.fn()

    expect(reloadOnce({ now: START, storage, reload })).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when the storage throws', () => {
    const reload = vi.fn()

    expect(reloadOnce({ now: START, storage: throwingStorage, reload })).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload when the storage cannot be written', () => {
    const storage = { ...createStorage(), setItem: () => { throw new Error('QuotaExceededError') } }
    const reload = vi.fn()

    expect(reloadOnce({ now: START, storage, reload })).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})

describe('reportChunkReload', () => {
  it('neither throws nor loses the boot when sending the message fails', () => {
    const storage = createStorage()
    reloadOnce({ now: 1_767_225_600_000, storage, reload: () => {} })
    const capture = () => { throw new Error('Sentry is not ready') }

    expect(() => reportChunkReload({ storage, capture })).not.toThrow()
  })

  it('sends one recovered message and clears the flag', () => {
    const storage = createStorage()
    reloadOnce({ now: 1_767_225_600_000, storage, reload: () => {} })
    const capture = vi.fn()

    reportChunkReload({ storage, capture })
    reportChunkReload({ storage, capture })

    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledWith('chunk_reload_recovered', 'info')
    expect(storage.getItem('chunk-reload-pending')).toBeNull()
  })

  it('sends nothing without the flag', () => {
    const capture = vi.fn()

    reportChunkReload({ storage: createStorage(), capture })

    expect(capture).not.toHaveBeenCalled()
  })

  it('neither throws nor sends when the storage throws', () => {
    const capture = vi.fn()

    expect(() => reportChunkReload({ storage: throwingStorage, capture })).not.toThrow()
    expect(capture).not.toHaveBeenCalled()
  })
})

describe('with the real window.sessionStorage and Sentry, the way the app calls them', () => {
  // main.jsx calls reportChunkReload() and ErrorBoundary calls reloadOnce() with no arguments, so
  // the defaults are the production path.
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    window.sessionStorage.clear()
    vi.mocked(Sentry.captureMessage).mockReset()
  })

  it('reloads once, then reports the recovery on the next boot only', () => {
    const reload = vi.fn()

    expect(reloadOnce({ reload })).toBe(true)
    expect(reloadOnce({ reload })).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)

    reportChunkReload()
    reportChunkReload()

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
    expect(Sentry.captureMessage).toHaveBeenCalledWith('chunk_reload_recovered', 'info')
  })

  it('reports nothing on a boot that did not follow a reload', () => {
    reportChunkReload()

    expect(Sentry.captureMessage).not.toHaveBeenCalled()
  })
})

describe('when reading window.sessionStorage throws', () => {
  // A browser that blocks site storage throws on the read itself. reportChunkReload runs at the top of
  // main.jsx, before the app renders: if this read leaves the try, the app never paints.
  beforeEach(() => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reloadOnce does not reload', () => {
    const reload = vi.fn()

    expect(reloadOnce({ reload })).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('reportChunkReload neither throws nor sends', () => {
    const capture = vi.fn()

    expect(() => reportChunkReload({ capture })).not.toThrow()
    expect(capture).not.toHaveBeenCalled()
  })
})
