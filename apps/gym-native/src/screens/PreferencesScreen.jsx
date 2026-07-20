import { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView, Pressable, Animated, Alert, AppState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { LogOut, Users, MessageSquare, Inbox, Dumbbell, ChevronRight } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useChangeWeightUnit, useChangeMeasurementUnit } from '@gym/shared'
import { usePreferences, useUpdatePreference } from '../hooks/usePreferences'
import { useAuth, useIsAdmin, useCanUploadVideo, useIsPremium } from '../hooks/useAuth'
import { LoadingSpinner, PlanBadge, PageHeader, ConfirmModal } from '../components/ui'
import { WeightUnitChangeModal, MeasurementUnitChangeModal, FeedbackModal } from '../components/Preferences'
import useWorkoutStore from '../stores/workoutStore'
import { colors } from '../lib/styles'
import {
  REST_NOTIFICATIONS_ENABLED_KEY,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  openNotificationSettings,
} from '../lib/restTimerNotifications'
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
  const [showFeedback, setShowFeedback] = useState(false)
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

  const [restNotificationsEnabled, setRestNotificationsEnabled] = useState(true)
  const [systemNotifPermission, setSystemNotifPermission] = useState(null)

  useEffect(() => {
    AsyncStorage.getItem(REST_NOTIFICATIONS_ENABLED_KEY).then(saved => {
      if (saved !== null) setRestNotificationsEnabled(saved === 'true')
    })
    getNotificationPermissionStatus().then(setSystemNotifPermission)
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        getNotificationPermissionStatus().then(setSystemNotifPermission)
      }
    })
    return () => subscription.remove()
  }, [])

  const persistRestNotifications = (value) => {
    setRestNotificationsEnabled(value)
    AsyncStorage.setItem(REST_NOTIFICATIONS_ENABLED_KEY, String(value))
  }

  const handleRestNotificationsChange = async (value) => {
    if (!value) {
      persistRestNotifications(false)
      return
    }
    const current = systemNotifPermission ?? (await getNotificationPermissionStatus())
    if (current.granted) {
      persistRestNotifications(true)
      return
    }
    if (current.canAskAgain) {
      const result = await requestNotificationPermission()
      setSystemNotifPermission(result)
      if (result.granted) {
        persistRestNotifications(true)
      }
      return
    }
    Alert.alert(
      t('common:preferences.restNotificationsBlockedTitle'),
      t('common:preferences.restNotificationsBlockedBody'),
      [
        { text: t('common:buttons.cancel'), style: 'cancel' },
        { text: t('common:preferences.openSettings'), onPress: openNotificationSettings },
      ],
    )
  }

  const handleChange = (key, value) => updatePreference.mutate({ key, value })

  const changeWeightUnit = useChangeWeightUnit()
  const [pendingUnit, setPendingUnit] = useState(null)

  const handleWeightUnitClick = (unit) => {
    const current = preferences?.weight_unit || 'kg'
    if (unit === current) return
    setPendingUnit(unit)
  }

  const applyWeightUnitChange = (convertHistorical) => {
    const fromUnit = preferences?.weight_unit || 'kg'
    const toUnit = pendingUnit
    changeWeightUnit.mutate(
      { scope: 'global', fromUnit, toUnit, convertHistorical },
      { onSuccess: () => setPendingUnit(null) },
    )
  }

  const changeMeasurementUnit = useChangeMeasurementUnit()
  const [pendingMeasurementUnit, setPendingMeasurementUnit] = useState(null)

  const handleMeasurementUnitClick = (unit) => {
    const current = preferences?.measurement_unit || 'cm'
    if (unit === current) return
    setPendingMeasurementUnit(unit)
  }

  const applyMeasurementUnitChange = (convertHistorical) => {
    const fromUnit = preferences?.measurement_unit || 'cm'
    const toUnit = pendingMeasurementUnit
    changeMeasurementUnit.mutate(
      { fromUnit, toUnit, convertHistorical },
      { onSuccess: () => setPendingMeasurementUnit(null) },
    )
  }

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
                    onPress={() => handleWeightUnitClick(unit)} disabled={changeWeightUnit.isPending} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14 }}>{t('common:preferences.measurementUnit')}</Text>
              <View style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: colors.bgTertiary }}>
                {['cm', 'in'].map((unit) => (
                  <SmallPill key={unit} label={unit} active={(preferences?.measurement_unit || 'cm') === unit}
                    onPress={() => handleMeasurementUnitClick(unit)} disabled={changeMeasurementUnit.isPending} />
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

        {/* GYMS */}
        <View>
          <SectionLabel>{t('common:gym.title')}</SectionLabel>
          <Pressable
            onPress={() => navigation.navigate('Gyms')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
          >
            <Dumbbell size={18} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>{t('common:gym.manage')}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>{t('common:gym.manageDescription')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* WORKOUT */}
        <View>
          <SectionLabel>{t('common:preferences.duringWorkout')}</SectionLabel>
          <ToggleRow label={t('common:preferences.timerSound')} description={t('common:preferences.timerSoundDescription')}
            checked={timerSoundEnabled} onChange={handleTimerSoundChange} />
          <ToggleRow
            label={t('common:preferences.restNotifications')}
            description={
              restNotificationsEnabled && systemNotifPermission && !systemNotifPermission.granted
                ? t('common:preferences.restNotificationsSystemDisabled')
                : t('common:preferences.restNotificationsDescription')
            }
            checked={restNotificationsEnabled && (systemNotifPermission?.granted ?? false)}
            onChange={handleRestNotificationsChange}
          />
          <ToggleRow label={t('common:preferences.progressionSuggestions')} description={t('common:preferences.progressionSuggestionsDesc')}
            checked={preferences?.progression_suggestions ?? true} onChange={(v) => handleChange('progression_suggestions', v)} disabled={updatePreference.isPending} />
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

        {/* REMINDERS */}
        <View>
          <SectionLabel>{t('common:preferences.remindersTitle')}</SectionLabel>
          <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14, flexShrink: 1 }}>{t('common:preferences.weightReminder')}</Text>
              <View style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: colors.bgTertiary }}>
                {[0, 3, 7, 14, 30].map(days => (
                  <SmallPill
                    key={days}
                    label={days === 0 ? t('common:preferences.reminderOff') : t('common:preferences.reminderDays', { count: days })}
                    active={Number(preferences?.body_weight_reminder_days) === days}
                    onPress={() => handleChange('body_weight_reminder_days', days)}
                    disabled={updatePreference.isPending}
                  />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14, flexShrink: 1 }}>{t('common:preferences.measurementsReminder')}</Text>
              <View style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: colors.bgTertiary }}>
                {[0, 7, 14, 30, 60].map(days => (
                  <SmallPill
                    key={days}
                    label={days === 0 ? t('common:preferences.reminderOff') : t('common:preferences.reminderDays', { count: days })}
                    active={Number(preferences?.body_measurements_reminder_days) === days}
                    onPress={() => handleChange('body_measurements_reminder_days', days)}
                    disabled={updatePreference.isPending}
                  />
                ))}
              </View>
            </View>
          </View>
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

        {/* HELP */}
        <View>
          <SectionLabel>{t('common:feedback.sectionTitle')}</SectionLabel>
          <Pressable
            onPress={() => setShowFeedback(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
          >
            <MessageSquare size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>{t('common:feedback.sendButton')}</Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={{ gap: 8 }}>
          {isAdmin && (
            <>
              <Pressable
                onPress={() => navigation.navigate('AdminUsers')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
              >
                <Users size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>{t('common:nav.admin')}</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('AdminFeedback')}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
              >
                <Inbox size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>{t('common:admin.feedbackButton')}</Text>
              </Pressable>
            </>
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

      <WeightUnitChangeModal
        isOpen={!!pendingUnit}
        scope="global"
        fromUnit={preferences?.weight_unit || 'kg'}
        toUnit={pendingUnit || ''}
        isPending={changeWeightUnit.isPending}
        onConvert={() => applyWeightUnitChange(true)}
        onUnitOnly={() => applyWeightUnitChange(false)}
        onCancel={() => setPendingUnit(null)}
      />

      <MeasurementUnitChangeModal
        isOpen={!!pendingMeasurementUnit}
        fromUnit={preferences?.measurement_unit || 'cm'}
        toUnit={pendingMeasurementUnit || ''}
        isPending={changeMeasurementUnit.isPending}
        onConvert={() => applyMeasurementUnitChange(true)}
        onUnitOnly={() => applyMeasurementUnitChange(false)}
        onCancel={() => setPendingMeasurementUnit(null)}
      />

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </SafeAreaView>
  )
}
