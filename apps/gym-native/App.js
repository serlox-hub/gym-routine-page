import "./global.css"
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import * as SplashScreen from 'expo-splash-screen'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import Toast from 'react-native-toast-message'
import { queryClient } from './src/lib/queryClient'
import RootNavigator from './src/navigation/RootNavigator'
import { toastConfig } from './src/components/ui/toastConfig'
import ErrorBoundary from './src/components/ErrorBoundary'
import { supabase } from './src/lib/supabase'
import { initApi } from '@gym/shared'

initApi(supabase)

SplashScreen.preventAutoHideAsync()

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
})

const linking = {
  prefixes: [Linking.createURL('/'), 'diariogym://'],
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer
          linking={linking}
          theme={{
            ...DefaultTheme,
            dark: true,
            colors: {
              primary: '#58a6ff',
              background: '#0d1117',
              card: '#161b22',
              text: '#e6edf3',
              border: '#30363d',
              notification: '#f85149',
            },
          }}
        >
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
        <Toast config={toastConfig} position="bottom" bottomOffset={50} />
      </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  )
}
