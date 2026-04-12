import { useState } from 'react'
import { View, Text, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { validateSignupForm } from '@gym/shared'
import { Check } from 'lucide-react-native'
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={24} color={colors.success} />
          </View>
          <Text style={{ color: colors.success, fontSize: 20, fontWeight: '700' }}>{t('auth:signup.success')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>{t('auth:signup.checkEmail')}</Text>
          <Pressable onPress={() => navigation.navigate('Login')}
            style={{ width: '100%', backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('auth:login.title')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 32, alignItems: 'center' }}>

            {/* Logo + Title */}
            <View style={{ alignItems: 'center', gap: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: colors.bgTertiary, overflow: 'hidden' }}>
                <Image source={require('../../assets/icon.png')} style={{ width: 64, height: 64 }} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 4 }}>{t('auth:signup.title')}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>{t('auth:signup.subtitle')}</Text>
            </View>

            {/* Form */}
            <View style={{ width: '100%', gap: 16 }}>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>{t('auth:signup.email')}</Text>
                <TextInput value={email} onChangeText={setEmail}
                  placeholder="tu@email.com" placeholderTextColor={colors.textMuted}
                  keyboardType="email-address" autoCapitalize="none" autoComplete="email"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }} />
              </View>

              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>{t('auth:signup.password')}</Text>
                <TextInput value={password} onChangeText={setPassword}
                  placeholder={t('auth:signup.minChars')} placeholderTextColor={colors.textMuted}
                  secureTextEntry autoComplete="new-password"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }} />
              </View>

              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>{t('auth:signup.confirmPassword')}</Text>
                <TextInput value={confirmPassword} onChangeText={setConfirmPassword}
                  placeholder={t('auth:signup.confirmPassword')} placeholderTextColor={colors.textMuted}
                  secureTextEntry autoComplete="new-password"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }} />
              </View>

              {displayError ? (
                <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'center' }}>{displayError}</Text>
              ) : null}

              <Pressable onPress={handleSignup} disabled={isLoading}
                style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}>
                <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>
                  {isLoading ? t('common:buttons.loading') : t('auth:signup.submit')}
                </Text>
              </Pressable>
            </View>

            {/* Terms */}
            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>{t('auth:signup.terms')}</Text>

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

            {/* Login link */}
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
                {t('auth:signup.hasAccount')}{' '}
                <Text style={{ color: colors.success, fontWeight: '600' }}>{t('auth:signup.loginLink')}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
