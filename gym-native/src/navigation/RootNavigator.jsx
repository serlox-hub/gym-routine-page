import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '../hooks/useAuth'
import { View, ActivityIndicator, Text } from 'react-native'
import AuthStack from './AuthStack'
import AppStack from './AppStack'

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync()
    }
  }, [isLoading])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#3fb950" />
      </View>
    )
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />
}
