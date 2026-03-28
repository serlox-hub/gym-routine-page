import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, X, Pause, Play, Settings, Check, Share2 } from 'lucide-react'
import { useTrainingGoal, useUpdateTrainingGoal, fetchWorkoutSummary, getLastCycleSession } from '@gym/shared'
import { Card } from '../ui/index.js'
import WorkoutSummaryModal from '../Workout/WorkoutSummaryModal.jsx'
import { colors } from '../../lib/styles.js'

function WeeklyGoalWidget({ onOpenSettings }) {
  const navigate = useNavigate()
  const goal = useTrainingGoal()
  const updatePreference = useUpdateTrainingGoal()
  const [showSetup, setShowSetup] = useState(false)
  const [daysInput, setDaysInput] = useState('')
  const [summaryData, setSummaryData] = useState(null)
  const [loadingShare, setLoadingShare] = useState(false)

  const handleShareLastSession = async (sessionId) => {
    setLoadingShare(true)
    try {
      setSummaryData(await fetchWorkoutSummary(sessionId))
    } finally {
      setLoadingShare(false)
    }
  }

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

  const { streak, cycleProgress, cycleDays, isRestCycle, currentCycleKey, restCycles } = goal

  const handleToggleRestCycle = () => {
    const newRestCycles = isRestCycle
      ? restCycles.filter(k => k !== currentCycleKey)
      : [...restCycles, currentCycleKey]
    updatePreference.mutate({ key: 'training_rest_weeks', value: newRestCycles })
  }

  const handleDayClick = (day) => {
    if (!day.hasSession) return
    navigate(`/history/${day.sessions[day.sessions.length - 1].id}`)
  }

  const lastSession = !isRestCycle ? getLastCycleSession(cycleDays) : null

  return (
    <section className="mb-6">
      <Card className="px-3 py-3">
        {isRestCycle ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pause size={14} style={{ color: colors.textSecondary }} />
              <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                Descanso
              </span>
              {streak > 0 && (
                <span className="text-xs" style={{ color: colors.textMuted }}>
                  · racha protegida
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleToggleRestCycle} className="p-1" style={{ color: colors.textSecondary }} title="Quitar descanso">
                <Play size={12} />
              </button>
              {onOpenSettings && (
                <button onClick={onOpenSettings} className="p-1" style={{ color: colors.textSecondary }} title="Configurar">
                  <Settings size={12} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: cycleProgress.isComplete ? colors.success : colors.textSecondary }}>
                {cycleProgress.completed}/{cycleProgress.target}
              </span>
              {streak > 0 && (
                <div className="flex items-center gap-1">
                  <Flame size={14} style={{ color: colors.warning }} />
                  <span className="text-xs font-bold" style={{ color: colors.warning }}>
                    Racha de {streak}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <button onClick={handleToggleRestCycle} className="p-1" style={{ color: colors.textSecondary }} title="Marcar como descanso">
                  <Pause size={12} />
                </button>
                {onOpenSettings && (
                  <button onClick={onOpenSettings} className="p-1" style={{ color: colors.textSecondary }} title="Configurar">
                    <Settings size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-1">
              {cycleDays.map((day) => (
                <DaySlot key={day.dateStr} day={day} onClick={() => handleDayClick(day)} />
              ))}
            </div>

            {lastSession && (
              <button
                onClick={() => handleShareLastSession(lastSession.id)}
                disabled={loadingShare}
                className="flex items-center gap-1.5 mt-3 mx-auto text-xs transition-colors"
                style={{ color: colors.accent }}
              >
                <Share2 size={12} />
                {loadingShare ? 'Cargando...' : 'Compartir último entrenamiento'}
              </button>
            )}
          </div>
        )}
      </Card>

      {summaryData && (
        <WorkoutSummaryModal
          summaryData={summaryData}
          onClose={() => setSummaryData(null)}
        />
      )}
    </section>
  )
}

function DaySlot({ day, onClick }) {
  const filled = day.hasSession
  const isToday = day.isToday
  const isFuture = !day.isPast && !day.isToday

  return (
    <button
      onClick={onClick}
      disabled={!filled}
      className="flex flex-col items-center gap-1 flex-1 min-w-0"
    >
      <span className="text-[10px] font-medium" style={{ color: isToday ? colors.textPrimary : colors.textMuted }}>
        {day.label}
      </span>
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: filled
            ? colors.success
            : isToday
              ? colors.accentBg
              : colors.bgTertiary,
          border: filled
            ? '2px solid transparent'
            : isToday
              ? `2px dashed ${colors.accent}`
              : `2px dashed ${colors.border}`,
          cursor: filled ? 'pointer' : 'default',
          opacity: isFuture && !filled ? 0.4 : 1,
        }}
      >
        {filled && <Check size={14} style={{ color: colors.white }} strokeWidth={3} />}
        {!filled && day.isPast && (
          <span style={{ color: colors.textMuted, fontSize: 14, fontWeight: 700, lineHeight: 1 }}>–</span>
        )}
      </div>
      <div
        className="w-1 h-1 rounded-full mt-0.5"
        style={{ backgroundColor: isToday ? colors.accent : 'transparent' }}
      />
    </button>
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
                  Establece un objetivo de entrenamiento
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
              Dias de entrenamiento por ciclo
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
                      color: String(n) === daysInput ? colors.white : colors.textSecondary,
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
                  color: daysInput ? colors.white : colors.textSecondary,
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
