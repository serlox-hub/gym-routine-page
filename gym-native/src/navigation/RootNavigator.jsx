import { useAuth } from '../hooks/useAuth'
import { View, ActivityIndicator, Text } from 'react-native'
import AuthStack from './AuthStack'
import AppStack from './AppStack'

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#3fb950" />
        <Text className="text-secondary mt-4">Cargando...</Text>
      </View>
    )
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />
}
