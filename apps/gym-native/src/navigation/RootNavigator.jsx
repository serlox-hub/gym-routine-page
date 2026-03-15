import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '../hooks/useAuth'
import { View, ActivityIndicator } from 'react-native'
import AuthStack from './AuthStack'
import AppStack from './AppStack'
import ResetPasswordScreen from '../screens/ResetPasswordScreen'

export default function RootNavigator() {
  const { isAuthenticated, isLoading, isPasswordRecovery, clearPasswordRecovery } = useAuth()

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

  if (isPasswordRecovery) {
    return <ResetPasswordScreen onComplete={clearPasswordRecovery} />
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />
}
