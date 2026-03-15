import { View, Text } from 'react-native'

export default function ErrorMessage({ message, className = '' }) {
  return (
    <View className={`p-4 bg-danger-bg border border-danger/30 rounded-lg ${className}`}>
      <Text className="text-danger">{message}</Text>
    </View>
  )
}
