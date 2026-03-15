import { View, ActivityIndicator } from 'react-native'

export default function LoadingSpinner({ className = '', fullScreen = true }) {
  return (
    <View className={`items-center justify-center p-8 ${fullScreen ? 'flex-1' : ''} ${className}`}>
      <ActivityIndicator size="large" color="#58a6ff" />
    </View>
  )
}
