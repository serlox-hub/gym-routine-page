import { useState } from 'react'
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { validateResetPasswordForm } from '@gym/shared'
import { Button, Card } from '../components/ui'
import { inputStyle } from '../lib/styles'

export default function ResetPasswordScreen({ navigation, onComplete }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError('')

    const validation = validateResetPasswordForm({ password, confirmPassword })
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <View className="flex-1 items-center justify-center px-4">
          <Card className="w-full p-6 items-center">
            <Text className="text-primary text-2xl font-bold mb-4">
              Contraseña actualizada
            </Text>
            <Text className="text-secondary text-center mb-6">
              Tu contraseña ha sido actualizada correctamente.
            </Text>
            <Button onPress={onComplete || (() => navigation?.navigate('Login'))} className="w-full">
              Ir al inicio
            </Button>
          </Card>
        </View>
      </SafeAreaView>
    )
  }

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
            <Text className="text-primary text-2xl font-bold text-center mb-2">
              Nueva contraseña
            </Text>
            <Text className="text-secondary text-center mb-6">
              Ingresa tu nueva contraseña
            </Text>

            <View className="mb-4">
              <Text className="text-primary text-sm font-medium mb-1">Nueva contraseña</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#6e7681"
                secureTextEntry
                autoComplete="new-password"
                style={inputStyle}
              />
            </View>

            <View className="mb-4">
              <Text className="text-primary text-sm font-medium mb-1">Confirmar contraseña</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#6e7681"
                secureTextEntry
                autoComplete="new-password"
                style={inputStyle}
              />
            </View>

            {error ? (
              <Text className="text-danger text-sm text-center mb-4">{error}</Text>
            ) : null}

            <Button onPress={handleSubmit} loading={isLoading}>
              Guardar contraseña
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
