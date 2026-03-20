import { X } from 'lucide-react'
import { Card } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import PreferenceToggle from './PreferenceToggle.jsx'

function TrainingGoalSection({ preferences, onChangeDays, onToggleWidget, disabled }) {
  const currentDays = preferences?.training_days_per_week
  const showWidget = preferences?.show_training_goal ?? true

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-4" style={{ color: colors.textSecondary }}>
        Objetivo de entrenamiento
      </h2>

      <div className="space-y-4">
        <div>
          <p className="font-medium text-sm mb-2" style={{ color: colors.textPrimary }}>
            Dias por semana
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <button
                key={n}
                onClick={() => onChangeDays(n)}
                disabled={disabled}
                className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: n === currentDays ? colors.accent : colors.bgTertiary,
                  color: n === currentDays ? '#fff' : colors.textSecondary,
                }}
              >
                {n}
              </button>
            ))}
            {currentDays && (
              <button
                onClick={() => onChangeDays(null)}
                disabled={disabled}
                className="w-9 h-9 rounded-lg text-sm transition-colors flex items-center justify-center"
                style={{
                  backgroundColor: colors.bgTertiary,
                  color: colors.textSecondary,
                }}
                title="Quitar objetivo"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <PreferenceToggle
          label="Mostrar widget en inicio"
          description="Ver el progreso semanal y racha en la pantalla principal"
          checked={showWidget}
          onChange={onToggleWidget}
          disabled={disabled}
        />
      </div>
    </Card>
  )
}

export default TrainingGoalSection
