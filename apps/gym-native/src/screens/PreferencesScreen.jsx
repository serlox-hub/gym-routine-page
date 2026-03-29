import { useState, useEffect } from 'react'
import { View, Text, Switch, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Check, X, Globe } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { usePreferences, useUpdatePreference } from '../hooks/usePreferences'
import { useCanUploadVideo, useIsPremium } from '../hooks/useAuth'
import { LoadingSpinner, Card, PlanBadge, PageHeader } from '../components/ui'
import { colors } from '../lib/styles'
const appVersion = require('../../app.json').expo.version

function PreferenceToggle({ label, description, checked, onChange, disabled }) {
  return (
    <View className="flex-row items-start gap-3 py-2" style={{ opacity: disabled ? 0.5 : 1 }}>
      <View className="flex-1">
        <Text className="font-medium text-sm text-primary">{label}</Text>
        <Text className="text-xs text-secondary">{description}</Text>
      </View>
      <Switch
        value={checked}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.bgTertiary, true: colors.success }}
        thumbColor={colors.textPrimary}
      />
    </View>
  )
}

function PremiumFeature({ title, description, enabled, comingSoon }) {
  const { t } = useTranslation()
  return (
    <View className="flex-row items-start gap-3 py-1">
      <View className="mt-0.5">
        {enabled ? (
          <Check size={16} color={colors.success} />
        ) : (
          <X size={16} color={colors.textSecondary} />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="text-sm"
            style={{ color: enabled ? colors.textPrimary : colors.textSecondary }}
          >
            {title}
          </Text>
          {comingSoon && (
            <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgTertiary }}>
              <Text className="text-xs text-secondary">{t('common:preferences.comingSoon')}</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-secondary">{description}</Text>
      </View>
    </View>
  )
}

export default function PreferencesScreen({ navigation }) {
  const { t } = useTranslation()
  const { data: preferences, isLoading } = usePreferences()
  const updatePreference = useUpdatePreference()
  const canUploadVideo = useCanUploadVideo()
  const isPremium = useIsPremium()

  const [timerSoundEnabled, setTimerSoundEnabled] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem('timer_sound_enabled').then(saved => {
      if (saved !== null) setTimerSoundEnabled(saved === 'true')
    })
  }, [])

  const handleTimerSoundChange = (value) => {
    setTimerSoundEnabled(value)
    AsyncStorage.setItem('timer_sound_enabled', String(value))
  }

  const handleChange = (key, value) => {
    updatePreference.mutate({ key, value })
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title={t('common:preferences.title')} onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="gap-4">
          {/* Language Section */}
          <Card className="p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Globe size={16} color={colors.textSecondary} />
              <Text className="text-sm font-medium text-secondary">
                {t('common:preferences.language')}
              </Text>
            </View>
            <View className="flex-row gap-2">
              {[
                { code: 'es', label: t('common:preferences.spanish') },
                { code: 'en', label: t('common:preferences.english') },
              ].map(({ code, label }) => {
                const isActive = (preferences?.language || 'es') === code
                return (
                  <Pressable
                    key={code}
                    onPress={() => handleChange('language', code)}
                    className="flex-1 py-2 px-3 rounded-lg items-center"
                    style={{ backgroundColor: isActive ? colors.accent : colors.bgTertiary }}
                    disabled={updatePreference.isPending}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: isActive ? '#fff' : colors.textSecondary }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Card>

          {/* Plan Section */}
          <Card className="p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-medium text-secondary">{t('common:preferences.yourPlan')}</Text>
              <PlanBadge isPremium={isPremium} />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-primary">{t('common:preferences.premiumBenefits')}</Text>
              <PremiumFeature
                title={t('common:preferences.showVideoUpload')}
                description={t('common:preferences.videoDescription')}
                enabled={isPremium}
              />
              <PremiumFeature
                title={t('common:preferences.moreFeaturesComingSoon')}
                description={t('common:preferences.moreFeaturesDescription')}
                enabled={isPremium}
                comingSoon
              />
            </View>
          </Card>

          {/* Workout Preferences */}
          <Card className="p-4">
            <Text className="text-sm font-medium text-secondary mb-4">
              {t('common:preferences.duringWorkout')}
            </Text>

            <View className="gap-2">
              <PreferenceToggle
                label={t('common:preferences.timerSound')}
                description={t('common:preferences.timerSoundDescription')}
                checked={timerSoundEnabled}
                onChange={handleTimerSoundChange}
              />

              <PreferenceToggle
                label={t('common:preferences.showRir')}
                description={t('common:preferences.showRirDescription')}
                checked={preferences?.show_rir_input ?? true}
                onChange={(value) => handleChange('show_rir_input', value)}
                disabled={updatePreference.isPending}
              />

              <PreferenceToggle
                label={t('common:preferences.showSetNotes')}
                description={t('common:preferences.showSetNotesDescription')}
                checked={preferences?.show_set_notes ?? true}
                onChange={(value) => handleChange('show_set_notes', value)}
                disabled={updatePreference.isPending}
              />

              <PreferenceToggle
                label={t('common:preferences.showSessionNotes')}
                description={t('common:preferences.showSessionNotesDescription')}
                checked={preferences?.show_session_notes ?? true}
                onChange={(value) => handleChange('show_session_notes', value)}
                disabled={updatePreference.isPending}
              />

              {canUploadVideo && (
                <PreferenceToggle
                  label={t('common:preferences.showVideoUpload')}
                  description={t('common:preferences.showVideoUploadDescription')}
                  checked={preferences?.show_video_upload ?? true}
                  onChange={(value) => handleChange('show_video_upload', value)}
                  disabled={updatePreference.isPending}
                />
              )}
            </View>
          </Card>
        </View>

        <Text className="text-center text-xs mt-2 mb-4" style={{ color: colors.textSecondary }}>
          v{appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
