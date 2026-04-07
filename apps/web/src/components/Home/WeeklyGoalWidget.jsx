import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flame, X, Pause, Play, Settings, Check, Share2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useTrainingGoal, useUpdateTrainingGoal, fetchWorkoutSummary, getLastCycleSession,
  getCurrentCycleDays, getCurrentCycleProgress, getCurrentCycleKey, countSessionsByCycle,
  getCycleDateRange, formatShortDate,
} from '@gym/shared'
import { Card } from '../ui/index.js'
import WorkoutSummaryModal from '../Workout/WorkoutSummaryModal.jsx'
import { colors } from '../../lib/styles.js'

const CYCLE_LENGTH = 7
const MAX_OFFSET = -12

function WeeklyGoalWidget({ onOpenSettings }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const goal = useTrainingGoal()
  const updatePreference = useUpdateTrainingGoal()
  const [showSetup, setShowSetup] = useState(false)
  const [daysInput, setDaysInput] = useState('')
  const [summaryData, setSummaryData] = useState(null)
  const [loadingShare, setLoadingShare] = useState(false)
  const [cycleOffset, setCycleOffset] = useState(0)

  // All hooks must be before any early return
  const { streak, restCycles, sessions = [], daysPerCycle, weekStartDay = 'monday' } = goal.isConfigured ? goal : {}
  const isCurrentCycle = cycleOffset === 0

  const referenceDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + cycleOffset * CYCLE_LENGTH)
    return d
  }, [cycleOffset])

  const sessionsByCycle = useMemo(
    () => sessions.length ? countSessionsByCycle(sessions, CYCLE_LENGTH, weekStartDay) : {},
    [sessions, weekStartDay]
  )

  const viewedCycleDays = useMemo(
    () => getCurrentCycleDays(sessions, CYCLE_LENGTH, referenceDate, weekStartDay),
    [sessions, referenceDate, weekStartDay]
  )

  const dateRangeLabel = useMemo(() => {
    const { start, end } = getCycleDateRange(CYCLE_LENGTH, referenceDate, weekStartDay)
    return `${formatShortDate(start)} – ${formatShortDate(end)}`
  }, [referenceDate, weekStartDay])

  const handleShareLastSession = async (sessionId) => {
    setLoadingShare(true)
    try {
      setSummaryData(await fetchWorkoutSummary(sessionId))
    } finally {
      setLoadingShare(false)
    }
  }

  if (goal.isLoading) return null

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

  const viewedCycleKey = getCurrentCycleKey(CYCLE_LENGTH, referenceDate, weekStartDay)
  const viewedProgress = getCurrentCycleProgress(sessionsByCycle, daysPerCycle, CYCLE_LENGTH, referenceDate, weekStartDay)
  const viewedIsRest = restCycles.includes(viewedCycleKey)

  const handleToggleRestCycle = () => {
    const newRestCycles = viewedIsRest
      ? restCycles.filter(k => k !== viewedCycleKey)
      : [...restCycles, viewedCycleKey]
    updatePreference.mutate({ key: 'training_rest_weeks', value: newRestCycles })
  }

  const handleDayClick = (day) => {
    if (!day.hasSession) return
    navigate(`/history/${day.sessions[day.sessions.length - 1].id}`)
  }

  const lastSession = isCurrentCycle && !viewedIsRest ? getLastCycleSession(viewedCycleDays) : null

  return (
    <section className="mb-6">
      <Card className="overflow-hidden">
        {/* Cycle navigation */}
        <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: colors.bgTertiary }}>
          <button onClick={() => setCycleOffset(o => Math.max(o - 1, MAX_OFFSET))} className="p-1" style={{ color: colors.textSecondary }}>
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] font-medium" style={{ color: colors.textSecondary }}>
            {dateRangeLabel}
          </span>
          {isCurrentCycle ? (
            onOpenSettings ? (
              <button onClick={onOpenSettings} className="p-1" style={{ color: colors.textSecondary }}>
                <Settings size={14} />
              </button>
            ) : (
              <div className="w-6" />
            )
          ) : (
            <button onClick={() => setCycleOffset(o => o + 1)} className="p-1" style={{ color: colors.textSecondary }}>
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        <div className="px-3 py-3">
        {viewedIsRest ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              {t('common:preferences.rest')}
            </span>
            {isCurrentCycle && streak > 0 && (
              <span className="text-xs" style={{ color: colors.textMuted }}>
                {t('common:preferences.streakProtected')}
              </span>
            )}
            <button
              onClick={handleToggleRestCycle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
            >
              <Play size={12} />
              {t('common:preferences.removeRest')}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              {isCurrentCycle ? (
                <>
                  <span className="text-xs font-medium" style={{ color: viewedProgress.isComplete ? colors.success : colors.textSecondary }}>
                    {viewedProgress.completed}/{viewedProgress.target}
                  </span>
                  {streak > 0 && (
                    <div className="flex items-center gap-1">
                      <Flame size={14} style={{ color: colors.warning }} />
                      <span className="text-xs font-bold" style={{ color: colors.warning }}>
                        {t('common:preferences.streak', { count: streak })}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-xs font-medium" style={{ color: viewedProgress.isComplete ? colors.success : colors.textSecondary }}>
                  {viewedProgress.completed}/{viewedProgress.target}
                </span>
              )}
              <button onClick={handleToggleRestCycle} className="p-1" style={{ color: colors.textSecondary }}>
                <Pause size={12} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-1">
              {viewedCycleDays.map((day) => (
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
                {loadingShare ? t('common:buttons.loading') : t('common:preferences.shareLastWorkout')}
              </button>
            )}
          </div>
        )}
        </div>
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
  const { t } = useTranslation()

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
                  {t('common:preferences.showTrainingGoal')}
                </p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  {t('common:preferences.trackConsistency')}
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
              {t('common:preferences.daysPerCycle')}
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
                {t('common:buttons.save')}
              </button>
            </div>
          </div>
        )}
      </Card>
    </section>
  )
}

export default WeeklyGoalWidget
