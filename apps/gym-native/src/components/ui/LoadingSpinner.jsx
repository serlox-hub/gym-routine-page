import { View, ActivityIndicator } from 'react-native'
import { colors } from '../../lib/styles'

export default function LoadingSpinner({ className = '', fullScreen = true }) {
  return (
    <View className={`items-center justify-center p-8 ${fullScreen ? 'flex-1' : ''} ${className}`}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  )
}
