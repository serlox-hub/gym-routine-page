import { Minimize2, Maximize2 } from 'lucide-react'
import { useRestTimer } from '../../hooks/useWorkout.js'
import { formatSecondsToMMSS } from '../../lib/timeUtils.js'
import useWorkoutStore from '../../stores/workoutStore.js'

function RestTimer() {
  const { isActive, timeRemaining, progress, skip, addTime } = useRestTimer()
  const minimized = useWorkoutStore(state => state.restTimerMinimized)
  const setMinimized = useWorkoutStore(state => state.setRestTimerMinimized)

  if (!isActive) return null

  const timeDisplay = formatSecondsToMMSS(timeRemaining)
  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3
  const timerColor = isCritical ? '#f85149' : isWarning ? '#d29922' : '#3fb950'

  if (minimized) {
    return (
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
        <div
          className="relative flex flex-col items-center gap-2 px-4 py-3 rounded-lg shadow-lg"
          style={{ backgroundColor: '#161b22', border: '2px solid #58a6ff' }}
        >
          <button
            onClick={() => setMinimized(false)}
            className="absolute top-1 right-1 p-1 rounded"
            style={{ backgroundColor: '#21262d', color: '#8b949e' }}
            title="Expandir"
          >
            <Maximize2 size={14} />
          </button>
          <span className="text-xs font-medium" style={{ color: '#58a6ff' }}>
            Descanso
          </span>
          <span
            className={`text-2xl font-bold font-mono ${isCritical ? 'animate-pulse' : ''}`}
            style={{ color: timerColor }}
          >
            {timeDisplay}
          </span>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: '#21262d' }}
          >
            <div
              className="h-full transition-all duration-1000"
              style={{ width: `${progress}%`, backgroundColor: timerColor }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addTime(-30)}
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
            >
              -30s
            </button>
            <button
              onClick={skip}
              className="px-3 py-1 rounded text-xs font-bold"
              style={{ backgroundColor: '#238636', color: '#ffffff' }}
            >
              SALTAR
            </button>
            <button
              onClick={() => addTime(30)}
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
            >
              +30s
            </button>
          </div>
        </div>
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
        style={{ backgroundColor: '#21262d', color: '#8b949e' }}
        title="Minimizar"
      >
        <Minimize2 size={20} />
      </button>

      <h2
        className="text-xl font-medium mb-8"
        style={{ color: '#8b949e' }}
      >
        DESCANSO
      </h2>

      <div
        className={`text-8xl font-bold mb-6 font-mono transition-colors ${
          isCritical ? 'animate-pulse' : ''
        }`}
        style={{
          color: isCritical ? '#f85149' : isWarning ? '#d29922' : '#e6edf3'
        }}
      >
        {timeDisplay}
      </div>

      <div
        className="w-64 h-2 rounded-full mb-8 overflow-hidden"
        style={{ backgroundColor: '#21262d' }}
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
          style={{ backgroundColor: '#21262d', color: '#8b949e' }}
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
          style={{ backgroundColor: '#21262d', color: '#8b949e' }}
        >
          +30s
        </button>
      </div>
    </div>
  )
}

export default RestTimer
