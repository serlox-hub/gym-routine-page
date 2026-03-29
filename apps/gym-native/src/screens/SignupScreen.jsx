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
import { validateSignupForm } from '@gym/shared'
import { Button, Card, GoogleIcon } from '../components/ui'
import { colors } from '../lib/styles'

export default function SignupScreen({ navigation }) {
  const { t } = useTranslation()
  const { signup, loginWithGoogle, isLoading, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async () => {
    setLocalError('')
    clearError()

    const validation = validateSignupForm({ email, password, confirmPassword })
    if (!validation.valid) {
      setLocalError(validation.error)
      return
    }

    const result = await signup(email, password)
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
            <Text className="text-success text-4xl mb-4">✓</Text>
            <Text className="text-success text-2xl font-bold mb-4">{t('auth:signup.success')}</Text>
            <Text className="text-secondary text-center mb-6">
              {t('auth:signup.checkEmail')}
            </Text>
            <Button onPress={() => navigation.navigate('Login')} className="w-full">
              {t('auth:login.title')}
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
            <Text className="text-primary text-2xl font-bold text-center mb-6">
              {t('auth:signup.title')}
            </Text>

            <View className="mb-4">
              <Text className="text-primary text-sm font-medium mb-1">{t('auth:signup.email')}</Text>
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

            <View className="mb-4">
              <Text className="text-primary text-sm font-medium mb-1">{t('auth:signup.password')}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth:signup.minChars')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="new-password"
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-primary"
              />
            </View>

            <View className="mb-4">
              <Text className="text-primary text-sm font-medium mb-1">{t('auth:signup.confirmPassword')}</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('auth:signup.confirmPassword')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="new-password"
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-primary"
              />
            </View>

            {displayError && (
              <Text className="text-danger text-sm text-center mb-4">
                {displayError}
              </Text>
            )}

            <Button onPress={handleSignup} loading={isLoading} className="mb-4">
              {t('auth:signup.submit')}
            </Button>

            <View className="flex-row items-center gap-3 mb-4">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-secondary text-xs">{t('common:labels.or')}</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            <Pressable
              onPress={loginWithGoogle}
              disabled={isLoading}
              className="flex-row items-center justify-center gap-2 py-2.5 rounded-lg mb-4 border border-border"
              style={{ backgroundColor: colors.white, opacity: isLoading ? 0.5 : 1 }}
            >
              <GoogleIcon size={20} />
              <Text className="text-base font-medium" style={{ color: colors.textDark }}>
                {t('auth:login.google')}
              </Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text className="text-secondary text-sm text-center">
                {t('auth:signup.hasAccount')}{' '}
                <Text className="text-accent">{t('auth:signup.loginLink')}</Text>
              </Text>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
