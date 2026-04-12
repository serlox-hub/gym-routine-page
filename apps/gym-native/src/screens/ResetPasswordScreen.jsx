import { useState } from 'react'
import { View, Text, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { validateResetPasswordForm } from '@gym/shared'
import { Check } from 'lucide-react-native'
import { colors } from '../lib/styles'

export default function ResetPasswordScreen({ navigation, onComplete }) {
  const { t } = useTranslation()
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={24} color={colors.success} />
          </View>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>{t('auth:resetPassword.success')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>{t('auth:resetPassword.successDescription')}</Text>
          <Pressable onPress={onComplete || (() => navigation?.navigate('Login'))}
            style={{ width: '100%', backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('auth:forgotPassword.backToLogin')}</Text>
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
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 4 }}>{t('auth:resetPassword.title')}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>{t('auth:resetPassword.description')}</Text>
              </View>
            </View>

            {/* Form */}
            <View style={{ width: '100%', gap: 16 }}>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>{t('auth:resetPassword.newPassword')}</Text>
                <TextInput value={password} onChangeText={setPassword}
                  placeholder={t('auth:signup.minChars')} placeholderTextColor={colors.textMuted}
                  secureTextEntry autoComplete="new-password"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }} />
              </View>

              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>{t('auth:resetPassword.confirmPassword')}</Text>
                <TextInput value={confirmPassword} onChangeText={setConfirmPassword}
                  placeholder={t('auth:resetPassword.confirmPassword')} placeholderTextColor={colors.textMuted}
                  secureTextEntry autoComplete="new-password"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }} />
              </View>

              {error ? (
                <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'center' }}>{error}</Text>
              ) : null}

              <Pressable onPress={handleSubmit} disabled={isLoading}
                style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: isLoading ? 0.5 : 1 }}>
                <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>
                  {isLoading ? t('common:buttons.loading') : t('auth:resetPassword.submit')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
