import { useState, useEffect, useRef, useCallback } from 'react'
import { formatSecondsToMMSS } from '@gym/shared'
import { colors } from '../../lib/styles.js'

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

  const isCritical = remaining <= 3 && remaining > 0
  const isDone = remaining === 0 && !isRunning

  if (!isRunning && remaining === seconds) {
    return (
      <button
        onClick={handleStart}
        disabled={seconds === 0}
        className="px-3 py-1 rounded text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: colors.actionPrimary, color: colors.textDark }}
      >
        ▶
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded"
      style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
    >
      <span
        className={`font-mono font-bold ${isCritical || isDone ? 'animate-pulse' : ''}`}
        style={{ color: isDone ? colors.success : isCritical ? colors.danger : colors.textPrimary }}
      >
        {formatSecondsToMMSS(remaining)}
      </span>

      <button
        onClick={handleStop}
        className="text-xs transition-opacity hover:opacity-80"
        style={{ color: colors.textSecondary }}
      >
        ✕
      </button>
    </div>
  )
}

export default ExecutionTimer
