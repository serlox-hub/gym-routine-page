import "./global.css"
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { queryClient } from './src/lib/queryClient'
import RootNavigator from './src/navigation/RootNavigator'

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer
          theme={{
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
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
