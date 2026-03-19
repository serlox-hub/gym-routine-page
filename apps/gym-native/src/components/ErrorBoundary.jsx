import { Component } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { colors } from '../lib/styles'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, errorInfo: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error?.message, error?.stack, errorInfo?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Ha ocurrido un error inesperado'
      const componentStack = this.state.errorInfo?.componentStack

      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            backgroundColor: colors.bgPrimary,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: 8,
            }}
          >
            Algo salió mal
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: 16,
              maxWidth: 300,
            }}
          >
            {errorMessage}
          </Text>
          {componentStack && (
            <ScrollView
              style={{
                maxHeight: 120,
                marginBottom: 16,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: colors.bgSecondary,
                width: '100%',
              }}
            >
              <Text
                style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'monospace' }}
                selectable
              >
                {componentStack.trim()}
              </Text>
            </ScrollView>
          )}
          <Pressable
            onPress={this.handleReset}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: colors.accent,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#ffffff' }}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      )
    }
    return this.props.children
  }
}
