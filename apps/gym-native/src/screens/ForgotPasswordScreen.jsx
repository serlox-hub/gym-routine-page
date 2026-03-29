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
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { Button, Card } from '../components/ui'
import { colors } from '../lib/styles'

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation()
  const { resetPassword, isLoading, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setLocalError('')
    clearError()

    if (!email) {
      setLocalError(t('auth:forgotPassword.enterEmail'))
      return
    }

    const result = await resetPassword(email)
    if (result.success) {
      setSuccess(true)
    }
  }

  const displayError = localError || error

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <View className="flex-1 items-center justify-center px-4">
          <Card className="w-full p-6 items-center">
            <Text className="text-primary text-2xl font-bold mb-4">{t('auth:forgotPassword.checkEmail')}</Text>
            <Text className="text-secondary text-center mb-6">
              {t('auth:forgotPassword.success')}{' '}
              <Text className="text-primary font-semibold">{email}</Text>
            </Text>
            <Button onPress={() => navigation.navigate('Login')} className="w-full">
              {t('auth:forgotPassword.backToLogin')}
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
              {t('auth:forgotPassword.title')}
            </Text>
            <Text className="text-secondary text-center mb-6">
              {t('auth:forgotPassword.description')}
            </Text>

            <View className="mb-4">
              <Text className="text-primary text-sm font-medium mb-1">{t('auth:login.email')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-primary"
              />
            </View>

            {displayError && (
              <Text className="text-danger text-sm text-center mb-4">
                {displayError}
              </Text>
            )}

            <Button onPress={handleSubmit} loading={isLoading} className="mb-4">
              {t('auth:forgotPassword.submit')}
            </Button>

            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text className="text-accent text-sm text-center">
                {t('auth:forgotPassword.backToLogin')}
              </Text>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
