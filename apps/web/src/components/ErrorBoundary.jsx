import { Component } from 'react'
import { colors } from '../lib/styles.js'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
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
            Algo salió mal
          </h2>
          <p
            className="text-sm mb-6 text-center max-w-md"
            style={{ color: colors.textSecondary }}
          >
            {this.state.error?.message || 'Ha ocurrido un error inesperado'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary }}
            >
              Reintentar
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: colors.accent, color: '#ffffff' }}
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
