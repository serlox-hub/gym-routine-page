import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, LoadingSpinner } from '../components/ui/index.js'
import { usePreferences, useUpdatePreference } from '../hooks/usePreferences.js'
import { useCanUploadVideo } from '../hooks/useAuth.js'
import { colors } from '../lib/styles.js'

function Preferences() {
  const navigate = useNavigate()
  const { data: preferences, isLoading } = usePreferences()
  const updatePreference = useUpdatePreference()
  const canUploadVideo = useCanUploadVideo()

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
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <ArrowLeft size={20} style={{ color: colors.textSecondary }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
            Preferencias
          </h1>
        </div>
      </header>

      <main className="space-y-4">
        <Card className="p-4">
          <h2 className="text-sm font-medium mb-4" style={{ color: colors.textSecondary }}>
            Durante el entrenamiento
          </h2>

          <div className="space-y-4">
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
      </main>
    </div>
  )
}

function PreferenceToggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <div className="pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className="w-10 h-6 rounded-full relative transition-colors"
          style={{
            backgroundColor: checked ? colors.success : colors.bgTertiary,
          }}
        >
          <div
            className="w-4 h-4 rounded-full absolute top-1 transition-all"
            style={{
              backgroundColor: colors.textPrimary,
              left: checked ? '22px' : '4px',
            }}
          />
        </div>
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm" style={{ color: colors.textPrimary }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          {description}
        </p>
      </div>
    </label>
  )
}

export default Preferences
