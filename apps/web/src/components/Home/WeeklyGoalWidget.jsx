import { useState } from 'react'
import { Flame, X, Pause, Play, Settings } from 'lucide-react'
import { useTrainingGoal, useUpdateTrainingGoal } from '@gym/shared'
import { Card } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function WeeklyGoalWidget({ onOpenSettings }) {
  const goal = useTrainingGoal()
  const updatePreference = useUpdateTrainingGoal()
  const [showSetup, setShowSetup] = useState(false)
  const [daysInput, setDaysInput] = useState('')

  if (goal.isLoading) return null

  // No configurado: mostrar invitacion a configurar
  if (!goal.isConfigured && goal.showWidget) {
    return (
      <SetupPrompt
        showSetup={showSetup}
        daysInput={daysInput}
        onToggleSetup={() => setShowSetup(!showSetup)}
        onDaysChange={setDaysInput}
        onSave={() => {
          const days = parseInt(daysInput)
          if (days >= 1 && days <= 7) {
            updatePreference.mutate({ key: 'training_days_per_week', value: days })
            setShowSetup(false)
          }
        }}
        onDismiss={() => {
          updatePreference.mutate({ key: 'show_training_goal', value: false })
        }}
      />
    )
  }

  if (!goal.showWidget || !goal.isConfigured) return null

  const { streak, weekProgress, isRestWeek, currentWeekKey, restWeeks } = goal

  const handleToggleRestWeek = () => {
    const newRestWeeks = isRestWeek
      ? restWeeks.filter(w => w !== currentWeekKey)
      : [...restWeeks, currentWeekKey]
    updatePreference.mutate({ key: 'training_rest_weeks', value: newRestWeeks })
  }

  const progressPercent = Math.min((weekProgress.completed / weekProgress.target) * 100, 100)

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium" style={{ color: colors.textSecondary }}>
          Objetivo semanal
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleRestWeek}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: colors.textSecondary }}
            title={isRestWeek ? 'Quitar semana de descanso' : 'Marcar semana de descanso'}
          >
            {isRestWeek ? <Play size={14} /> : <Pause size={14} />}
          </button>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: colors.textSecondary }}
              title="Configurar objetivo"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>

      <Card className="p-4">
        {isRestWeek ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(139, 148, 158, 0.15)' }}>
              <Pause size={20} style={{ color: colors.textSecondary }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                Semana de descanso
              </p>
              {streak > 0 && (
                <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  Racha de {streak} {streak === 1 ? 'semana' : 'semanas'} protegida
                </p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {streak > 0 && (
                  <div className="flex items-center gap-1">
                    <Flame size={16} style={{ color: colors.warning }} />
                    <span className="text-sm font-bold" style={{ color: colors.warning }}>
                      {streak} {streak === 1 ? 'semana en racha' : 'semanas en racha'}
                    </span>
                  </div>
                )}
                <span className="text-sm" style={{ color: colors.textPrimary }}>
                  {weekProgress.completed}/{weekProgress.target} dias esta semana
                </span>
              </div>
              {weekProgress.isComplete && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.successBg, color: colors.success }}>
                  Completado
                </span>
              )}
            </div>

            <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.bgTertiary }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: weekProgress.isComplete ? colors.success : colors.accent,
                }}
              />
            </div>
          </div>
        )}
      </Card>
    </section>
  )
}

function SetupPrompt({ showSetup, daysInput, onToggleSetup, onDaysChange, onSave, onDismiss }) {
  return (
    <section className="mb-6">
      <Card className="p-4">
        {!showSetup ? (
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={onToggleSetup}
            >
              <div className="p-2 rounded-lg" style={{ backgroundColor: colors.warningBg }}>
                <Flame size={20} style={{ color: colors.warning }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                  Establece un objetivo semanal
                </p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Lleva el seguimiento de tu constancia
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-md"
              style={{ color: colors.textSecondary }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: colors.textPrimary }}>
              Dias de entrenamiento por semana
            </p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    onClick={() => onDaysChange(String(n))}
                    className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: String(n) === daysInput ? colors.accent : colors.bgTertiary,
                      color: String(n) === daysInput ? '#fff' : colors.textSecondary,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={onSave}
                disabled={!daysInput}
                className="px-3 h-9 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: daysInput ? colors.success : colors.bgTertiary,
                  color: daysInput ? '#fff' : colors.textSecondary,
                  opacity: daysInput ? 1 : 0.5,
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </Card>
    </section>
  )
}

export default WeeklyGoalWidget
