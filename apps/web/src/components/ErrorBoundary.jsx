import { Component } from 'react'
import * as Sentry from '@sentry/react'
import { t } from '@gym/shared'
import { colors } from '../lib/styles.js'
import { isChunkLoadError, reloadOnce } from '../lib/chunkReload.js'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, reloading: false }

  // A route chunk from an old deploy reloads the page instead of showing the error (issue #217).
  // Offline the same message can mean no network. A page the service worker does not control (first
  // visit, private window) would then reload onto the browser's offline page. One it controls would
  // reload fine from the precache, but this guard does not tell them apart.
  static getDerivedStateFromError(error) {
    return { hasError: true, error, reloading: isChunkLoadError(error) && navigator.onLine !== false }
  }

  componentDidCatch(error) {
    if (!this.state.reloading) return
    if (reloadOnce()) return
    // Already reloaded a few minutes ago, or no storage to stop a loop: show the error after all.
    this.setState({ reloading: false })
    Sentry.captureException(error, { tags: { chunk_reload: 'exhausted' } })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    // Blank while the page reloads, so the error does not flash.
    if (this.state.reloading) {
      return <div className="min-h-screen" style={{ backgroundColor: colors.bgPrimary }} />
    }
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen p-6"
          style={{ backgroundColor: colors.bgPrimary }}
        >
          <h2
            className="text-lg font-semibold mb-2"
            style={{ color: colors.textPrimary }}
          >
            {t('common:errors.somethingWrong')}
          </h2>
          <p
            className="text-sm mb-6 text-center max-w-md"
            style={{ color: colors.textSecondary }}
          >
            {this.state.error?.message || t('common:errors.unexpected')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="min-h-11 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary }}
            >
              {t('common:buttons.retry')}
            </button>
            <button
              onClick={this.handleReload}
              className="min-h-11 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: colors.success, color: colors.bgPrimary }}
            >
              {t('common:buttons.reload')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
