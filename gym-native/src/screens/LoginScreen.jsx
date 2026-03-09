import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'
import { Button, Card } from '../components/ui'

export default function LoginScreen({ navigation }) {
  const { login, isLoading, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleLogin = async () => {
    setLocalError('')
    clearError()

    if (!email || !password) {
      setLocalError('Por favor completa todos los campos')
      return
    }

    await login(email, password)
  }

  const displayError = localError || error

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          className="px-4"
        >
          <Card className="p-6">
            <Text className="text-primary text-2xl font-bold text-center mb-6">
              Iniciar Sesión
            </Text>

            <View className="mb-4">
              <Text className="text-primary text-sm font-medium mb-1">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor="#6e7681"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-primary"
              />
            </View>

            <View className="mb-1">
              <Text className="text-primary text-sm font-medium mb-1">Contraseña</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#6e7681"
                secureTextEntry
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-primary"
              />
            </View>

            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              className="self-end mb-4"
            >
              <Text className="text-accent text-sm">¿Olvidaste tu contraseña?</Text>
            </Pressable>

            {displayError && (
              <Text className="text-danger text-sm text-center mb-4">
                {displayError}
              </Text>
            )}

            <Button onPress={handleLogin} loading={isLoading} className="mb-4">
              Entrar
            </Button>

            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text className="text-secondary text-sm text-center">
                ¿No tienes cuenta?{' '}
                <Text className="text-accent">Regístrate</Text>
              </Text>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
