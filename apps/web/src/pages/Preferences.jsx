import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { Card, LoadingSpinner, PlanBadge, PageHeader } from '../components/ui/index.js'
import { PreferenceToggle, InstallAppSection, TrainingGoalSection } from '../components/Preferences/index.js'
import { usePreferences, useUpdatePreference } from '../hooks/usePreferences.js'
import { useCanUploadVideo, useIsPremium } from '../hooks/useAuth.js'
import { colors } from '../lib/styles.js'

function Preferences() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: preferences, isLoading } = usePreferences()
  const updatePreference = useUpdatePreference()
  const canUploadVideo = useCanUploadVideo()
  const isPremium = useIsPremium()

  // Preferencia de sonido guardada en localStorage (funciona offline)
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

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <PageHeader title={t('common:preferences.title')} onBack={() => navigate(-1)} />

      <main className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: colors.textSecondary }}>
              {t('common:preferences.plan')}
            </h2>
            <PlanBadge isPremium={isPremium} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium" style={{ color: colors.textPrimary }}>
              {t('common:preferences.premiumBenefits')}
            </h3>
            <ul className="space-y-2">
              <PremiumFeature
                title={t('common:preferences.uploadVideos')}
                description={t('common:preferences.videoDescription')}
                enabled={isPremium}
              />
              <PremiumFeature
                title={t('common:preferences.comingSoon')}
                description={t('common:preferences.comingSoonDesc')}
                enabled={isPremium}
                comingSoon
              />
            </ul>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium mb-4" style={{ color: colors.textSecondary }}>
            {t('common:preferences.general')}
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                {t('common:preferences.language')}
              </h3>
              <div className="flex gap-2">
                {[
                  { code: 'es', label: t('common:preferences.spanish') },
                  { code: 'en', label: t('common:preferences.english') },
                ].map(({ code, label }) => {
                  const isActive = (preferences?.language || 'es') === code
                  return (
                    <button
                      key={code}
                      onClick={() => handleChange('language', code)}
                      className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? colors.accent : colors.bgTertiary,
                        color: isActive ? '#fff' : colors.textSecondary,
                      }}
                      disabled={updatePreference.isPending}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                {t('common:preferences.weightUnit')}
              </h3>
              <p className="text-xs mb-2" style={{ color: colors.textMuted }}>
                {t('common:preferences.weightUnitDescription')}
              </p>
              <div className="flex gap-2">
                {['kg', 'lb'].map((unit) => {
                  const isActive = (preferences?.weight_unit || 'kg') === unit
                  return (
                    <button
                      key={unit}
                      onClick={() => handleChange('weight_unit', unit)}
                      className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? colors.accent : colors.bgTertiary,
                        color: isActive ? '#fff' : colors.textSecondary,
                      }}
                      disabled={updatePreference.isPending}
                    >
                      {unit}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                {t('common:preferences.weekStartDay')}
              </h3>
              <div className="flex gap-1">
                {[{ value: 'monday', label: t('common:preferences.monday') }, { value: 'sunday', label: t('common:preferences.sunday') }].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleChange('week_start_day', value)}
                    disabled={updatePreference.isPending}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: (preferences?.week_start_day || 'monday') === value ? colors.accent : colors.bgTertiary,
                      color: (preferences?.week_start_day || 'monday') === value ? colors.white : colors.textSecondary,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium mb-4" style={{ color: colors.textSecondary }}>
            {t('common:preferences.duringWorkout')}
          </h2>

          <div className="space-y-4">
            <PreferenceToggle
              label={t('common:preferences.timerSound')}
              description={t('common:preferences.timerSoundDesc')}
              checked={timerSoundEnabled}
              onChange={handleTimerSoundChange}
            />

            <PreferenceToggle
              label={t('common:preferences.showRir')}
              description={t('common:preferences.showRirDesc')}
              checked={preferences?.show_rir_input ?? true}
              onChange={(value) => handleChange('show_rir_input', value)}
              disabled={updatePreference.isPending}
            />

            <PreferenceToggle
              label={t('common:preferences.showSetNotes')}
              description={t('common:preferences.showSetNotesDesc')}
              checked={preferences?.show_set_notes ?? true}
              onChange={(value) => handleChange('show_set_notes', value)}
              disabled={updatePreference.isPending}
            />

            <PreferenceToggle
              label={t('common:preferences.showSessionNotes')}
              description={t('common:preferences.showSessionNotesDesc')}
              checked={preferences?.show_session_notes ?? true}
              onChange={(value) => handleChange('show_session_notes', value)}
              disabled={updatePreference.isPending}
            />

            {canUploadVideo && (
              <PreferenceToggle
                label={t('common:preferences.showVideoUpload')}
                description={t('common:preferences.videoDescription')}
                checked={preferences?.show_video_upload ?? true}
                onChange={(value) => handleChange('show_video_upload', value)}
                disabled={updatePreference.isPending}
              />
            )}
          </div>
        </Card>

        <TrainingGoalSection
          preferences={preferences}
          onChangeDays={(value) => handleChange('training_days_per_week', value)}
          onToggleWidget={(value) => handleChange('show_training_goal', value)}
          disabled={updatePreference.isPending}
        />

        <InstallAppSection />

        <p className="text-center text-xs mt-2" style={{ color: colors.textMuted }}>
          v{__APP_VERSION__}
        </p>
      </main>
    </div>
  )
}

function PremiumFeature({ title, description, enabled, comingSoon }) {
  const { t } = useTranslation()
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5">
        {enabled ? (
          <Check size={16} style={{ color: colors.success }} />
        ) : (
          <X size={16} style={{ color: colors.textSecondary }} />
        )}
      </div>
      <div>
        <p className="text-sm" style={{ color: enabled ? colors.textPrimary : colors.textSecondary }}>
          {title}
          {comingSoon && (
            <span
              className="ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
            >
              {t('common:preferences.comingSoon')}
            </span>
          )}
        </p>
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          {description}
        </p>
      </div>
    </li>
  )
}

export default Preferences
