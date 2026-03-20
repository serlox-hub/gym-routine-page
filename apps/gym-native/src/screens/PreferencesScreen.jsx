import { useState, useEffect } from 'react'
import { View, Text, Switch, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
              <Text className="text-xs text-secondary">Próximamente</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-secondary">{description}</Text>
      </View>
    </View>
  )
}

export default function PreferencesScreen({ navigation }) {
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
      <PageHeader title="Preferencias" onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="gap-4">
          {/* Plan Section */}
          <Card className="p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-medium text-secondary">Tu plan</Text>
              <PlanBadge isPremium={isPremium} />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-primary">Beneficios Premium</Text>
              <PremiumFeature
                title="Subir videos"
                description="Graba y guarda videos de tus series para revisar tu técnica"
                enabled={isPremium}
              />
              <PremiumFeature
                title="Más funciones próximamente"
                description="Nuevas características exclusivas en desarrollo"
                enabled={isPremium}
                comingSoon
              />
            </View>
          </Card>

          {/* Workout Preferences */}
          <Card className="p-4">
            <Text className="text-sm font-medium text-secondary mb-4">
              Durante el entrenamiento
            </Text>

            <View className="gap-2">
              <PreferenceToggle
                label="Sonido y vibración del timer"
                description="Reproducir sonido y vibrar cuando termine el descanso"
                checked={timerSoundEnabled}
                onChange={handleTimerSoundChange}
              />

              <PreferenceToggle
                label="Registrar RIR (esfuerzo)"
                description="Mostrar selector de RIR al completar cada serie"
                checked={preferences?.show_rir_input ?? true}
                onChange={(value) => handleChange('show_rir_input', value)}
                disabled={updatePreference.isPending}
              />

              <PreferenceToggle
                label="Notas por serie"
                description="Permitir añadir notas a cada serie completada"
                checked={preferences?.show_set_notes ?? true}
                onChange={(value) => handleChange('show_set_notes', value)}
                disabled={updatePreference.isPending}
              />

              <PreferenceToggle
                label="Notas al finalizar"
                description="Mostrar campo de notas al terminar la sesión"
                checked={preferences?.show_session_notes ?? true}
                onChange={(value) => handleChange('show_session_notes', value)}
                disabled={updatePreference.isPending}
              />

              {canUploadVideo && (
                <PreferenceToggle
                  label="Grabar video"
                  description="Permitir adjuntar video a cada serie"
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
