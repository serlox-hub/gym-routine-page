import { Minimize2, Maximize2 } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { useRestTimer } from '../../hooks/useWorkout.js'
import { useDraggable } from '../../hooks/useDrag.js'
import { formatSecondsToMMSS } from '@gym/shared'
import useWorkoutStore from '../../stores/workoutStore.js'

function RestTimer() {
  const { isActive, timeRemaining, progress, skip, addTime } = useRestTimer()
  const minimized = useWorkoutStore(state => state.restTimerMinimized)
  const setMinimized = useWorkoutStore(state => state.setRestTimerMinimized)
  const { dragProps, dragStyle, wasDragged } = useDraggable()

  if (!isActive) return null

  const timeDisplay = formatSecondsToMMSS(timeRemaining)
  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3
  const timerColor = isCritical ? colors.danger : isWarning ? colors.warning : colors.success

  if (minimized) {
    const handleExpand = () => {
      if (wasDragged.current) return
      setMinimized(false)
    }

    return (
      <div
        className="fixed z-50 select-none"
        style={{ top: 8, left: '50%', ...dragStyle }}
        {...dragProps}
      >
        <button
          onClick={handleExpand}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg cursor-grab active:cursor-grabbing"
          style={{ backgroundColor: colors.bgSecondary, border: `2px solid ${timerColor}` }}
          title="Expandir"
        >
          <span
            className={`text-sm font-bold font-mono ${isCritical ? 'animate-pulse' : ''}`}
            style={{ color: timerColor }}
          >
            {timeDisplay}
          </span>
          <Maximize2 size={14} style={{ color: colors.textSecondary }} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(13, 17, 23, 0.95)' }}
    >
      <button
        onClick={() => setMinimized(true)}
        className="absolute top-4 right-4 p-2 rounded-lg"
        style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
        title="Minimizar"
      >
        <Minimize2 size={20} />
      </button>

      <h2
        className="text-xl font-medium mb-8"
        style={{ color: colors.textSecondary }}
      >
        DESCANSO
      </h2>

      <div
        className={`text-8xl font-bold mb-6 font-mono transition-colors ${
          isCritical ? 'animate-pulse' : ''
        }`}
        style={{
          color: isCritical ? colors.danger : isWarning ? colors.warning : colors.textPrimary
        }}
      >
        {timeDisplay}
      </div>

      <div
        className="w-64 h-2 rounded-full mb-8 overflow-hidden"
        style={{ backgroundColor: colors.bgTertiary }}
      >
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            backgroundColor: timerColor
          }}
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => addTime(-30)}
          className="px-6 py-3 rounded-lg text-lg font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
        >
          -30s
        </button>

        <button
          onClick={skip}
          className="px-8 py-3 rounded-lg text-lg font-bold transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#238636', color: '#ffffff' }}
        >
          SALTAR
        </button>

        <button
          onClick={() => addTime(30)}
          className="px-6 py-3 rounded-lg text-lg font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
        >
          +30s
        </button>
      </div>
    </div>
  )
}

export default RestTimer
