import { useState, useEffect } from 'react'
import { View, Text, Switch, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react-native'
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

function TrainingGoalCard({ preferences, onChangeDays, onToggleWidget, disabled }) {
  const { t } = useTranslation()
  const currentDays = preferences?.training_days_per_week
  const showWidget = preferences?.show_training_goal ?? true

  return (
    <Card className="p-4">
      <Text className="text-sm font-medium text-secondary mb-3">
        {t('common:preferences.trainingGoalTitle')}
      </Text>

      <View className="gap-4">
        <View>
          <Text className="font-medium text-sm text-primary mb-2">
            {t('common:preferences.trainingDaysPerWeek')}
          </Text>
          <View className="flex-row flex-wrap gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <Pressable
                key={n}
                onPress={() => onChangeDays(n)}
                disabled={disabled}
                className="w-9 h-9 rounded-lg items-center justify-center"
                style={{ backgroundColor: n === currentDays ? colors.accent : colors.bgTertiary }}
              >
                <Text className="text-sm font-medium" style={{ color: n === currentDays ? '#fff' : colors.textSecondary }}>
                  {n}
                </Text>
              </Pressable>
            ))}
            {currentDays && (
              <Pressable
                onPress={() => onChangeDays(null)}
                disabled={disabled}
                className="w-9 h-9 rounded-lg items-center justify-center"
                style={{ backgroundColor: colors.bgTertiary }}
                accessibilityLabel={t('common:preferences.removeGoal')}
              >
                <X size={14} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        <PreferenceToggle
          label={t('common:preferences.showWidgetHome')}
          description={t('common:preferences.showWidgetHomeDescription')}
          checked={showWidget}
          onChange={onToggleWidget}
          disabled={disabled}
        />
      </View>
    </Card>
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

          {/* General: Language + Weight Unit + Week Start */}
          <Card className="p-4">
            <Text className="text-sm font-medium text-secondary mb-4">
              {t('common:preferences.general')}
            </Text>

            <View className="gap-4">
              <View>
                <Text className="font-medium text-sm text-primary mb-2">
                  {t('common:preferences.language')}
                </Text>
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
              </View>

              <View>
                <Text className="font-medium text-sm text-primary mb-1">
                  {t('common:preferences.weightUnit')}
                </Text>
                <Text className="text-xs mb-2" style={{ color: colors.textMuted }}>
                  {t('common:preferences.weightUnitDescription')}
                </Text>
                <View className="flex-row gap-2">
                  {['kg', 'lb'].map((unit) => {
                    const isActive = (preferences?.weight_unit || 'kg') === unit
                    return (
                      <Pressable
                        key={unit}
                        onPress={() => handleChange('weight_unit', unit)}
                        className="flex-1 py-2 px-3 rounded-lg items-center"
                        style={{ backgroundColor: isActive ? colors.accent : colors.bgTertiary }}
                        disabled={updatePreference.isPending}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{ color: isActive ? '#fff' : colors.textSecondary }}
                        >
                          {unit}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              <View>
                <Text className="font-medium text-sm text-primary mb-2">
                  {t('common:preferences.weekStartDay')}
                </Text>
                <View className="flex-row gap-1">
                  {[{ value: 'monday', label: t('common:preferences.monday') }, { value: 'sunday', label: t('common:preferences.sunday') }].map(({ value, label }) => (
                    <Pressable
                      key={value}
                      onPress={() => handleChange('week_start_day', value)}
                      disabled={updatePreference.isPending}
                      className="flex-1 py-2 rounded-lg items-center"
                      style={{ backgroundColor: (preferences?.week_start_day || 'monday') === value ? colors.accent : colors.bgTertiary }}
                    >
                      <Text className="text-sm font-medium" style={{ color: (preferences?.week_start_day || 'monday') === value ? '#fff' : colors.textSecondary }}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
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

          {/* Training Goal */}
          <TrainingGoalCard
            preferences={preferences}
            onChangeDays={(value) => handleChange('training_days_per_week', value)}
            onToggleWidget={(value) => handleChange('show_training_goal', value)}
            disabled={updatePreference.isPending}
          />
        </View>

        <Text className="text-center text-xs mt-2 mb-4" style={{ color: colors.textSecondary }}>
          v{appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
