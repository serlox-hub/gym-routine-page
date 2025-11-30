import { useRestTimer } from '../../hooks/useRestTimer.js'

function RestTimer() {
  const { isActive, timeRemaining, progress, skip, addTime } = useRestTimer()

  if (!isActive) return null

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`

  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(13, 17, 23, 0.95)' }}
    >
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
            backgroundColor: isCritical ? '#f85149' : isWarning ? '#d29922' : '#3fb950'
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
