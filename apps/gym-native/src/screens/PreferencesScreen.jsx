import { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView, Pressable, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { LogOut, Users } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { usePreferences, useUpdatePreference } from '../hooks/usePreferences'
import { useAuth, useIsAdmin, useCanUploadVideo, useIsPremium } from '../hooks/useAuth'
import { LoadingSpinner, PlanBadge, PageHeader, ConfirmModal } from '../components/ui'
import useWorkoutStore from '../stores/workoutStore'
import { colors } from '../lib/styles'
const appVersion = require('../../app.json').expo.version

function SmallPill({ label, active, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
        backgroundColor: active ? colors.success : 'transparent',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.bgPrimary : colors.textMuted }}>
        {label}
      </Text>
    </Pressable>
  )
}

function CustomToggle({ checked, onChange, disabled }) {
  return (
    <Pressable onPress={() => !disabled && onChange(!checked)} style={{ opacity: disabled ? 0.5 : 1 }}>
      <View style={{
        width: 48, height: 28, borderRadius: 14,
        backgroundColor: checked ? colors.success : colors.border,
      }}>
        <View style={{
          width: 20, height: 20, borderRadius: 10,
          backgroundColor: colors.bgPrimary,
          position: 'absolute', top: 4,
          left: checked ? 24 : 4,
        }} />
      </View>
    </Pressable>
  )
}

function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>{label}</Text>
        {description && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{description}</Text>}
      </View>
      <CustomToggle checked={checked} onChange={onChange} disabled={disabled} />
    </View>
  )
}

function SectionLabel({ children }) {
  return (
    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </Text>
  )
}

export default function PreferencesScreen({ navigation, route }) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const { data: preferences, isLoading } = usePreferences()
  const updatePreference = useUpdatePreference()
  const canUploadVideo = useCanUploadVideo()
  const isPremium = useIsPremium()
  const { isAdmin } = useIsAdmin()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const scrollRef = useRef(null)
  const goalY = useRef(0)
  const highlightAnim = useRef(new Animated.Value(0)).current
  const scrollTo = route?.params?.scrollTo

  useEffect(() => {
    if (scrollTo === 'training-goal' && !isLoading) {
      setTimeout(() => {
        if (goalY.current > 0) scrollRef.current?.scrollTo({ y: goalY.current - 16, animated: true })
        Animated.sequence([
          Animated.timing(highlightAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.delay(1000),
          Animated.timing(highlightAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
        ]).start()
      }, 400)
    }
  }, [scrollTo, isLoading, highlightAnim])

  const handleLogoutClick = () => {
    if (hasActiveSession) setShowLogoutConfirm(true)
    else handleLogout()
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try { await logout() } catch { setIsLoggingOut(false) }
  }

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

  const handleChange = (key, value) => updatePreference.mutate({ key, value })

  if (isLoading) return <LoadingSpinner />

  const currentDays = preferences?.training_days_per_week
  const showWidget = preferences?.show_training_goal ?? true

  const borderColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.success],
  })

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title={t('common:preferences.title')} onBack={() => navigation.goBack()} />

      <ScrollView ref={scrollRef} className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40, gap: 20 }}>

        {/* Your plan */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 14,
            borderWidth: 1, borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('common:preferences.plan')}</Text>
          <PlanBadge isPremium={isPremium} />
        </View>

        {/* GENERAL */}
        <View>
          <SectionLabel>{t('common:preferences.general')}</SectionLabel>
          <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14 }}>{t('common:preferences.language')}</Text>
              <View style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: colors.bgTertiary }}>
                {[{ code: 'es', label: 'ES' }, { code: 'en', label: 'EN' }].map(({ code, label }) => (
                  <SmallPill key={code} label={label} active={(preferences?.language || 'es') === code}
                    onPress={() => handleChange('language', code)} disabled={updatePreference.isPending} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14 }}>{t('common:preferences.weightUnit')}</Text>
              <View style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: colors.bgTertiary }}>
                {['kg', 'lb'].map((unit) => (
                  <SmallPill key={unit} label={unit} active={(preferences?.weight_unit || 'kg') === unit}
                    onPress={() => handleChange('weight_unit', unit)} disabled={updatePreference.isPending} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14 }}>{t('common:preferences.weekStartDay')}</Text>
              <View style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: colors.bgTertiary }}>
                {[
                  { value: 'monday', label: t('common:preferences.mondayShort') || 'Mon' },
                  { value: 'sunday', label: t('common:preferences.sundayShort') || 'Sun' },
                ].map(({ value, label }) => (
                  <SmallPill key={value} label={label} active={(preferences?.week_start_day || 'monday') === value}
                    onPress={() => handleChange('week_start_day', value)} disabled={updatePreference.isPending} />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* WORKOUT */}
        <View>
          <SectionLabel>{t('common:preferences.duringWorkout')}</SectionLabel>
          <ToggleRow label={t('common:preferences.timerSound')} description={t('common:preferences.timerSoundDescription')}
            checked={timerSoundEnabled} onChange={handleTimerSoundChange} />
          <ToggleRow label={t('common:preferences.showRir')} description={t('common:preferences.showRirDescription')}
            checked={preferences?.show_rir_input ?? true} onChange={(v) => handleChange('show_rir_input', v)} disabled={updatePreference.isPending} />
          <ToggleRow label={t('common:preferences.showSetNotes')} description={t('common:preferences.showSetNotesDescription')}
            checked={preferences?.show_set_notes ?? true} onChange={(v) => handleChange('show_set_notes', v)} disabled={updatePreference.isPending} />
          <ToggleRow label={t('common:preferences.showSessionNotes')} description={t('common:preferences.showSessionNotesDescription')}
            checked={preferences?.show_session_notes ?? true} onChange={(v) => handleChange('show_session_notes', v)} disabled={updatePreference.isPending} />
          {canUploadVideo && (
            <ToggleRow label={t('common:preferences.showVideoUpload')} description={t('common:preferences.showVideoUploadDescription')}
              checked={preferences?.show_video_upload ?? true} onChange={(v) => handleChange('show_video_upload', v)} disabled={updatePreference.isPending} />
          )}
        </View>

        {/* TRAINING GOAL */}
        <View onLayout={(e) => { goalY.current = e.nativeEvent.layout.y }}>
          <SectionLabel>{t('common:preferences.trainingGoalTitle')}</SectionLabel>
          <Animated.View style={{
            backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor, borderRadius: 12, padding: 16, gap: 16,
          }}>
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 10 }}>
                {t('common:preferences.trainingDaysPerWeek')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <Pressable
                    key={n}
                    onPress={() => handleChange('training_days_per_week', n)}
                    disabled={updatePreference.isPending}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: n === currentDays ? colors.success : colors.bgTertiary,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: n === currentDays ? colors.bgPrimary : colors.textMuted }}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <ToggleRow
              label={t('common:preferences.showWidgetHome')}
              description={t('common:preferences.showWidgetHomeDescription')}
              checked={showWidget}
              onChange={(v) => handleChange('show_training_goal', v)}
              disabled={updatePreference.isPending}
            />
          </Animated.View>
        </View>

        {/* Actions */}
        <View style={{ gap: 8 }}>
          {isAdmin && (
            <Pressable
              onPress={() => navigation.navigate('AdminUsers')}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
            >
              <Users size={16} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>{t('common:nav.admin')}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleLogoutClick}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.dangerBg }}
          >
            <LogOut size={16} color={colors.danger} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.danger }}>{t('common:nav.logout')}</Text>
          </Pressable>
          <Text style={{ textAlign: 'center', fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
            v{appVersion}
          </Text>
        </View>
      </ScrollView>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title={t('auth:logout.activeSession')}
        message={t('auth:logout.activeSessionMessage')}
        confirmText={t('common:nav.logout')}
        cancelText={t('auth:logout.continueTraining')}
        loadingText={t('auth:logout.loggingOut')}
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </SafeAreaView>
  )
}
