import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut, Users } from 'lucide-react'
import { LoadingSpinner, PlanBadge, PageHeader, ConfirmModal } from '../components/ui/index.js'
import { InstallAppSection, TrainingGoalSection } from '../components/Preferences/index.js'
import { usePreferences, useUpdatePreference } from '../hooks/usePreferences.js'
import { useAuth, useIsAdmin, useCanUploadVideo, useIsPremium } from '../hooks/useAuth.js'
import useWorkoutStore from '../stores/workoutStore.js'
import { colors } from '../lib/styles.js'

function SmallPill({ label, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
      style={{
        backgroundColor: active ? colors.success : 'transparent',
        color: active ? colors.bgPrimary : colors.textMuted,
      }}
    >
      {label}
    </button>
  )
}

function CustomToggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className="shrink-0"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <div
        className="w-12 h-7 rounded-full relative transition-colors"
        style={{ backgroundColor: checked ? colors.success : colors.border }}
      >
        <div
          className="w-5 h-5 rounded-full absolute top-1 transition-all"
          style={{
            backgroundColor: colors.bgPrimary,
            left: checked ? 24 : 4,
          }}
        />
      </div>
    </button>
  )
}

function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 min-w-0">
        <p style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500 }}>{label}</p>
        {description && <p style={{ color: colors.textMuted, fontSize: 12 }}>{description}</p>}
      </div>
      <CustomToggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

function Preferences() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const { data: preferences, isLoading } = usePreferences()
  const updatePreference = useUpdatePreference()
  const canUploadVideo = useCanUploadVideo()
  const isPremium = useIsPremium()
  const { isAdmin } = useIsAdmin()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const goalRef = useRef(null)
  const [highlight, setHighlight] = useState(false)

  useEffect(() => {
    if (location.state?.scrollTo === 'training-goal' && !isLoading) {
      setTimeout(() => {
        goalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlight(true)
        setTimeout(() => setHighlight(false), 1800)
      }, 300)
    }
  }, [location.state, isLoading])
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogoutClick = () => {
    if (hasActiveSession) {
      setShowLogoutConfirm(true)
    } else {
      handleLogout()
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/')
    } catch {
      setIsLoggingOut(false)
    }
  }

  const [timerSoundEnabled, setTimerSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('timer_sound_enabled')
      return saved === null ? true : saved === 'true'
    } catch {
      return true
    }
  })

  const handleTimerSoundChange = (value) => {
    setTimerSoundEnabled(value)
    try {
      localStorage.setItem('timer_sound_enabled', String(value))
    } catch {
      // Ignorar errores de localStorage
    }
  }

  const handleChange = (key, value) => {
    updatePreference.mutate({ key, value })
  }

  if (isLoading) return <div className="p-4 max-w-2xl mx-auto"><LoadingSpinner /></div>

  return (
    <div className="px-6 pt-4 pb-20 max-w-2xl mx-auto">
      <PageHeader title={t('common:preferences.title')} onBack={() => navigate(-1)} />

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Your plan */}
        <div
          className="flex items-center justify-between rounded-xl"
          style={{ backgroundColor: colors.bgSecondary, padding: '12px 16px', border: `1px solid ${colors.border}` }}
        >
          <span style={{ color: colors.textSecondary, fontSize: 13 }}>{t('common:preferences.plan')}</span>
          <PlanBadge isPremium={isPremium} />
        </div>

        {/* GENERAL */}
        <section>
          <span style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            {t('common:preferences.general')}
          </span>
          <div
            className="rounded-xl"
            style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, overflow: 'hidden' }}
          >
            <div className="flex items-center justify-between" style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
              <span style={{ color: colors.textPrimary, fontSize: 14 }}>{t('common:preferences.language')}</span>
              <div className="flex rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
                {[
                  { code: 'es', label: 'ES' },
                  { code: 'en', label: 'EN' },
                ].map(({ code, label }) => (
                  <SmallPill key={code} label={label} active={(preferences?.language || 'es') === code}
                    onClick={() => handleChange('language', code)} disabled={updatePreference.isPending} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between" style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
              <span style={{ color: colors.textPrimary, fontSize: 14 }}>{t('common:preferences.weightUnit')}</span>
              <div className="flex rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
                {['kg', 'lb'].map((unit) => (
                  <SmallPill key={unit} label={unit} active={(preferences?.weight_unit || 'kg') === unit}
                    onClick={() => handleChange('weight_unit', unit)} disabled={updatePreference.isPending} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between" style={{ padding: '14px 16px' }}>
              <span style={{ color: colors.textPrimary, fontSize: 14 }}>{t('common:preferences.weekStartDay')}</span>
              <div className="flex rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
                {[
                  { value: 'monday', label: t('common:preferences.mondayShort') || 'Mon' },
                  { value: 'sunday', label: t('common:preferences.sundayShort') || 'Sun' },
                ].map(({ value, label }) => (
                  <SmallPill key={value} label={label} active={(preferences?.week_start_day || 'monday') === value}
                    onClick={() => handleChange('week_start_day', value)} disabled={updatePreference.isPending} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WORKOUT */}
        <section>
          <span style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            {t('common:preferences.duringWorkout')}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <ToggleRow label={t('common:preferences.timerSound')} description={t('common:preferences.timerSoundDesc')}
              checked={timerSoundEnabled} onChange={handleTimerSoundChange} />
            <ToggleRow label={t('common:preferences.showRir')} description={t('common:preferences.showRirDesc')}
              checked={preferences?.show_rir_input ?? true} onChange={(v) => handleChange('show_rir_input', v)} disabled={updatePreference.isPending} />
            <ToggleRow label={t('common:preferences.showSetNotes')} description={t('common:preferences.showSetNotesDesc')}
              checked={preferences?.show_set_notes ?? true} onChange={(v) => handleChange('show_set_notes', v)} disabled={updatePreference.isPending} />
            <ToggleRow label={t('common:preferences.showSessionNotes')} description={t('common:preferences.showSessionNotesDesc')}
              checked={preferences?.show_session_notes ?? true} onChange={(v) => handleChange('show_session_notes', v)} disabled={updatePreference.isPending} />
            {canUploadVideo && (
              <ToggleRow label={t('common:preferences.showVideoUpload')} description={t('common:preferences.videoDescription')}
                checked={preferences?.show_video_upload ?? true} onChange={(v) => handleChange('show_video_upload', v)} disabled={updatePreference.isPending} />
            )}
          </div>
        </section>

        {/* TRAINING GOAL */}
        <div ref={goalRef}>
          <TrainingGoalSection
            preferences={preferences}
            onChangeDays={(value) => handleChange('training_days_per_week', value)}
            onToggleWidget={(value) => handleChange('show_training_goal', value)}
            disabled={updatePreference.isPending}
            highlight={highlight}
          />
        </div>

        <InstallAppSection />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/users')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: colors.bgSecondary, color: colors.textSecondary, border: `1px solid ${colors.border}` }}
            >
              <Users size={16} />
              {t('common:nav.admin')}
            </button>
          )}
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: colors.dangerBg, color: colors.danger }}
          >
            <LogOut size={16} />
            {t('common:nav.logout')}
          </button>
          <p className="text-center text-xs mt-1" style={{ color: colors.textMuted }}>
            v{__APP_VERSION__}
          </p>
        </div>
      </main>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title={t('auth:logout.activeSession')}
        message={t('auth:logout.confirm')}
        confirmText={t('common:nav.logout')}
        cancelText={t('common:buttons.continue')}
        loadingText={t('common:buttons.loading')}
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}

export default Preferences
