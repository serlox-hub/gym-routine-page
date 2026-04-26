import { ChevronDown, Maximize2, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'
import { useRestTimer } from '../../hooks/useWorkout.js'
import { useDraggable } from '../../hooks/useDrag.js'
import { formatSecondsToMMSS } from '@gym/shared'
import useWorkoutStore from '../../stores/workoutStore.js'

const CIRCLE_SIZE = 220
const STROKE_WIDTH = 6
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function RestTimer() {
  const { t } = useTranslation()
  const { isActive, timeRemaining, timeInitial, progress, context, skip, addTime } = useRestTimer()
  const minimized = useWorkoutStore(state => state.restTimerMinimized)
  const setMinimized = useWorkoutStore(state => state.setRestTimerMinimized)
  const { dragProps, dragStyle, wasDragged } = useDraggable()

  if (!isActive) return null

  const timeDisplay = formatSecondsToMMSS(timeRemaining)
  const totalDisplay = formatSecondsToMMSS(timeInitial)
  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3
  const timerColor = isCritical ? colors.danger : isWarning ? colors.warning : colors.success
  const dashOffset = CIRCUMFERENCE * (1 - progress / 100)

  if (minimized) {
    const handleExpand = () => {
      if (wasDragged.current) return
      setMinimized(false)
    }

    return (
      <div className="fixed z-50 select-none" style={{ top: 8, left: '50%', ...dragStyle }} {...dragProps}>
        <button onClick={handleExpand}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg cursor-grab active:cursor-grabbing"
          style={{ backgroundColor: colors.bgSecondary, border: `2px solid ${timerColor}` }}>
          <span className={`text-sm font-bold font-mono ${isCritical ? 'animate-pulse' : ''}`} style={{ color: timerColor }}>
            {timeDisplay}
          </span>
          <Maximize2 size={14} style={{ color: colors.textSecondary }} />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: colors.overlay }}>
      <div className="flex-1" onClick={() => setMinimized(true)} />
      <div className="rounded-t-2xl" style={{ backgroundColor: colors.bgSecondary, padding: '20px 20px 24px' }}>
        {/* Drag handle */}
        <div className="mx-auto mb-4" style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Timer size={16} style={{ color: colors.success }} />
            <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>
              {t('workout:rest.title').toUpperCase()}
            </span>
          </div>
          <button onClick={() => setMinimized(true)}
            className="flex items-center justify-center rounded-full hover:opacity-80"
            style={{ width: 32, height: 32, backgroundColor: colors.bgTertiary }}>
            <ChevronDown size={18} style={{ color: colors.textSecondary }} />
          </button>
        </div>

        {/* Circular timer */}
        <div className="flex justify-center mb-6">
          <div style={{ position: 'relative', width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
            <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                stroke={colors.textMuted} strokeWidth={STROKE_WIDTH} fill="none" />
              <circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                stroke={timerColor} strokeWidth={STROKE_WIDTH} fill="none"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-bold ${isCritical ? 'animate-pulse' : ''}`}
                style={{ color: colors.textPrimary, fontSize: 56, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>
                {timeDisplay}
              </span>
              <span style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>
                {t('workout:rest.of', { time: totalDisplay })}
              </span>
            </div>
          </div>
        </div>

        {/* Adjust pills */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button onClick={() => addTime(-15)}
            className="px-4 py-2 rounded-full text-sm font-medium hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary }}>
            − 15s
          </button>
          <button onClick={() => addTime(15)}
            className="px-4 py-2 rounded-full text-sm font-medium hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary }}>
            + 15s
          </button>
        </div>

        {/* Set progress */}
        {context.totalSets > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>
                {t('workout:rest.setsDone', { done: context.setNumber, total: context.totalSets })}
              </span>
              <span style={{ color: colors.textSecondary, fontSize: 12 }}>
                {t('workout:rest.setsLeft', { count: context.totalSets - context.setNumber })}
              </span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: context.totalSets }, (_, i) => (
                <div key={i} className="flex-1 rounded-full"
                  style={{ height: 4, backgroundColor: i < context.setNumber ? colors.success : colors.textMuted }} />
              ))}
            </div>
          </div>
        )}

        {/* Big skip button */}
        <button onClick={skip}
          className="w-full py-3.5 rounded-xl text-base font-semibold hover:opacity-90"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
          {t('workout:rest.skipRest')}
        </button>
      </div>
    </div>
  )
}

export default RestTimer
