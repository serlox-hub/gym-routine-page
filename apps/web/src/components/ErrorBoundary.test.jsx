import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as Sentry from '@sentry/react'
import { t } from '@gym/shared'
import { reloadOnce } from '../lib/chunkReload.js'
import ErrorBoundary from './ErrorBoundary.jsx'

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }))
// The real isChunkLoadError, so the test throws the messages the browsers throw.
vi.mock('../lib/chunkReload.js', async (importOriginal) => ({
  ...(await importOriginal()),
  reloadOnce: vi.fn(),
}))

const CHUNK_ERROR = new TypeError('Importing a module script failed.')
const BUG = new Error('Cannot read properties of undefined')

function Throws({ error }) {
  throw error
}

function renderThrowing(error) {
  return render(
    <ErrorBoundary>
      <Throws error={error} />
    </ErrorBoundary>
  )
}

function expectErrorScreen(error) {
  expect(screen.getByText(t('common:errors.somethingWrong'))).toBeInTheDocument()
  expect(screen.getByText(error.message)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: t('common:buttons.retry') })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: t('common:buttons.reload') })).toBeInTheDocument()
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs every error a boundary catches.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.mocked(reloadOnce).mockReset()
    vi.mocked(Sentry.captureException).mockReset()
  })

  it('reloads on a chunk error without showing the error', () => {
    vi.mocked(reloadOnce).mockReturnValue(true)

    renderThrowing(CHUNK_ERROR)

    expect(reloadOnce).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(t('common:errors.somethingWrong'))).not.toBeInTheDocument()
    expect(screen.queryByText(CHUNK_ERROR.message)).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('shows the error screen and reports it when it already reloaded', () => {
    vi.mocked(reloadOnce).mockReturnValue(false)

    renderThrowing(CHUNK_ERROR)

    expectErrorScreen(CHUNK_ERROR)
    expect(Sentry.captureException).toHaveBeenCalledWith(CHUNK_ERROR, { tags: { chunk_reload: 'exhausted' } })
  })

  it('shows the error screen on any other error, without reloading', () => {
    renderThrowing(BUG)

    expectErrorScreen(BUG)
    expect(reloadOnce).not.toHaveBeenCalled()
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('shows the error screen on a chunk error while offline, without reloading', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    renderThrowing(CHUNK_ERROR)

    expectErrorScreen(CHUNK_ERROR)
    expect(reloadOnce).not.toHaveBeenCalled()
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  describe('Retry after the reload was already used up', () => {
    const retry = () => screen.getByRole('button', { name: t('common:buttons.retry') })

    beforeEach(() => {
      vi.mocked(reloadOnce).mockReturnValue(false)
    })

    it('shows the error screen again, not a blank page, when the chunk still fails', () => {
      renderThrowing(CHUNK_ERROR)

      fireEvent.click(retry())

      expectErrorScreen(CHUNK_ERROR)
    })

    it('brings the page back once the chunk loads', () => {
      let chunkLoads = false
      function Route() {
        if (!chunkLoads) throw CHUNK_ERROR
        return <p>Home</p>
      }
      render(
        <ErrorBoundary>
          <Route />
        </ErrorBoundary>
      )
      chunkLoads = true

      fireEvent.click(retry())

      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.queryByText(t('common:errors.somethingWrong'))).not.toBeInTheDocument()
    })
  })
})
