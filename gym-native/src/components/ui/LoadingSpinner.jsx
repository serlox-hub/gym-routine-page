import { View, ActivityIndicator } from 'react-native'

export default function LoadingSpinner({ className = '' }) {
  return (
    <View className={`items-center justify-center p-8 ${className}`}>
      <ActivityIndicator size="large" color="#58a6ff" />
    </View>
  )
}
