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
import { Button, Card, GoogleIcon } from '../components/ui'
import { colors } from '../lib/styles'

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation()
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleLogin = async () => {
    setLocalError('')
    clearError()

    if (!email || !password) {
      setLocalError(t('auth:login.fillAllFields'))
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
              {t('auth:login.title')}
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

            <View className="mb-1">
              <Text className="text-primary text-sm font-medium mb-1">{t('auth:login.password')}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-primary"
              />
            </View>

            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              className="self-end mb-4"
            >
              <Text className="text-accent text-sm">{t('auth:login.forgotPassword')}</Text>
            </Pressable>

            {displayError && (
              <Text className="text-danger text-sm text-center mb-4">
                {displayError}
              </Text>
            )}

            <Button onPress={handleLogin} loading={isLoading} className="mb-4">
              {t('auth:login.submit')}
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

            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text className="text-secondary text-sm text-center">
                {t('auth:login.noAccount')}{' '}
                <Text className="text-accent">{t('auth:login.createAccount')}</Text>
              </Text>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
