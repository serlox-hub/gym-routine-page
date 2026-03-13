import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LoadingSpinner } from '../ui'

export default function WorkoutLoadingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center">
      <LoadingSpinner fullScreen={false} />
      <Text className="text-secondary text-sm mt-3">Preparando sesión...</Text>
    </SafeAreaView>
  )
}
