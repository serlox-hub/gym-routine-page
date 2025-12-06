import { useState } from 'react'
import { Minimize2, Maximize2 } from 'lucide-react'
import { useRestTimer } from '../../hooks/useWorkout.js'
import { formatSecondsToMMSS } from '../../lib/timeUtils.js'

function RestTimer() {
  const { isActive, timeRemaining, progress, skip, addTime } = useRestTimer()
  const [minimized, setMinimized] = useState(false)

  if (!isActive) return null

  const timeDisplay = formatSecondsToMMSS(timeRemaining)
  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3
  const timerColor = isCritical ? '#f85149' : isWarning ? '#d29922' : '#3fb950'

  if (minimized) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-50 p-3"
        style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}
      >
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <span
                className={`text-2xl font-bold font-mono ${isCritical ? 'animate-pulse' : ''}`}
                style={{ color: timerColor }}
              >
                {timeDisplay}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: '#21262d' }}
              >
                <div
                  className="h-full transition-all duration-1000"
                  style={{ width: `${progress}%`, backgroundColor: timerColor }}
                />
              </div>
            </div>
            <button
              onClick={() => setMinimized(false)}
              className="p-1.5 rounded ml-3"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
              title="Expandir"
            >
              <Maximize2 size={18} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => addTime(-30)}
              className="px-3 py-1.5 rounded text-sm font-medium"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
            >
              -30s
            </button>
            <button
              onClick={skip}
              className="px-4 py-1.5 rounded text-sm font-bold"
              style={{ backgroundColor: '#238636', color: '#ffffff' }}
            >
              SALTAR
            </button>
            <button
              onClick={() => addTime(30)}
              className="px-3 py-1.5 rounded text-sm font-medium"
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
