import { useState, useEffect, useRef, useCallback } from 'react'

function ExecutionTimer({ seconds }) {
  const [isRunning, setIsRunning] = useState(false)
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef(null)
  const audioContextRef = useRef(null)

  // Sincronizar con el valor externo cuando cambia
  useEffect(() => {
    if (!isRunning) {
      setRemaining(seconds)
    }
  }, [seconds, isRunning])

  const playBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = 880
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.15)
    } catch {
      // Ignorar errores de audio
    }
  }, [])

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, remaining])

  // Beep en los últimos 3 segundos y al terminar
  useEffect(() => {
    if (isRunning && remaining <= 3 && remaining > 0) {
      playBeep()
    }
    if (remaining === 0 && !isRunning) {
      playBeep()
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }, [remaining, isRunning, playBeep])

  const handleStart = () => {
    if (seconds > 0) {
      setRemaining(seconds)
      setIsRunning(true)
    }
  }

  const handleStop = () => {
    setIsRunning(false)
    setRemaining(seconds)
  }

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins}:${s.toString().padStart(2, '0')}`
  }

  const progress = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0
  const isCritical = remaining <= 3 && remaining > 0
  const isDone = remaining === 0 && !isRunning

  if (!isRunning && remaining === seconds) {
    return (
      <button
        onClick={handleStart}
        disabled={seconds === 0}
        className="px-3 py-1 rounded text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: '#238636', color: '#ffffff' }}
      >
        ▶
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded"
      style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
    >
      <span
        className={`font-mono font-bold ${isCritical || isDone ? 'animate-pulse' : ''}`}
        style={{ color: isDone ? '#3fb950' : isCritical ? '#f85149' : '#e6edf3' }}
      >
        {formatTime(remaining)}
      </span>

      <div
        className="w-12 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: '#30363d' }}
      >
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            backgroundColor: isDone ? '#3fb950' : isCritical ? '#f85149' : '#58a6ff'
          }}
        />
      </div>

      <button
        onClick={handleStop}
        className="text-xs transition-opacity hover:opacity-80"
        style={{ color: '#8b949e' }}
      >
        ✕
      </button>
    </div>
  )
}

export default ExecutionTimer
