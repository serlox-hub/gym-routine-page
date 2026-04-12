import { useState } from 'react'
import { View, Text, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 32, alignItems: 'center' }}>

            {/* Logo + Welcome */}
            <View style={{ alignItems: 'center', gap: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: colors.bgTertiary, overflow: 'hidden' }}>
                <Image source={require('../../assets/icon.png')} style={{ width: 64, height: 64 }} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 4 }}>{t('auth:login.welcome')}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('auth:login.subtitle')}</Text>
              </View>
            </View>

            {/* Form */}
            <View style={{ width: '100%', gap: 16 }}>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>{t('auth:login.email')}</Text>
                <TextInput value={email} onChangeText={setEmail}
                  placeholder="tu@email.com" placeholderTextColor={colors.textMuted}
                  keyboardType="email-address" autoCapitalize="none" autoComplete="email"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }} />
              </View>

              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>{t('auth:login.password')}</Text>
                <TextInput value={password} onChangeText={setPassword}
                  placeholder="••••••••" placeholderTextColor={colors.textMuted}
                  secureTextEntry autoComplete="current-password"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }} />
                <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
                  <Text style={{ color: colors.success, fontSize: 12 }}>{t('auth:login.forgotPassword')}</Text>
                </Pressable>
              </View>

              {displayError ? (
                <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'center' }}>{displayError}</Text>
              ) : null}

              <Pressable onPress={handleLogin} disabled={isLoading}
                style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}>
                <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>
                  {isLoading ? t('common:buttons.loading') : t('auth:login.submit')}
                </Text>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('auth:login.orContinueWith')}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            {/* Google */}
            <Pressable onPress={loginWithGoogle} disabled={isLoading}
              style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bgTertiary, opacity: isLoading ? 0.5 : 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>G</Text>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>{t('auth:login.google')}</Text>
            </Pressable>

            {/* Sign up link */}
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
                {t('auth:login.noAccount')}{' '}
                <Text style={{ color: colors.success, fontWeight: '600' }}>{t('auth:login.createAccount')}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
