import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { Card, LoadingSpinner, PlanBadge, PageHeader } from '../components/ui/index.js'
import { PreferenceToggle, InstallAppSection, TrainingGoalSection } from '../components/Preferences/index.js'
import { usePreferences, useUpdatePreference } from '../hooks/usePreferences.js'
import { useCanUploadVideo, useIsPremium } from '../hooks/useAuth.js'
import { colors } from '../lib/styles.js'

function Preferences() {
  const navigate = useNavigate()
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
      <PageHeader title="Preferencias" onBack={() => navigate(-1)} />

      <main className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: colors.textSecondary }}>
              Tu plan
            </h2>
            <PlanBadge isPremium={isPremium} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium" style={{ color: colors.textPrimary }}>
              Beneficios Premium
            </h3>
            <ul className="space-y-2">
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
            </ul>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium mb-4" style={{ color: colors.textSecondary }}>
            Durante el entrenamiento
          </h2>

          <div className="space-y-4">
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
          </div>
        </Card>

        <TrainingGoalSection
          preferences={preferences}
          onChangeDays={(value) => handleChange('training_days_per_week', value)}
          onToggleWidget={(value) => handleChange('show_training_goal', value)}
          disabled={updatePreference.isPending}
        />

        <InstallAppSection />
      </main>
    </div>
  )
}

function PremiumFeature({ title, description, enabled, comingSoon }) {
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
              Próximamente
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
