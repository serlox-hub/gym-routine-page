import { Component } from 'react'
import { View, Text, Pressable } from 'react-native'
import { colors } from '../lib/styles'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
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
              marginBottom: 24,
              maxWidth: 300,
            }}
          >
            {this.state.error?.message || 'Ha ocurrido un error inesperado'}
          </Text>
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
