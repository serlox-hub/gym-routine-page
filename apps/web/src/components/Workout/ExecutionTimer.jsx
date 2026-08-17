import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, X } from 'lucide-react'
import { formatDuration, formatElapsedSeconds } from '@gym/shared'
import { colors } from '../../lib/styles.js'

// Cuenta atrás de la duración de la serie. Vive como SUBFILA de la serie activa (igual que
// ProgressionHint), no dentro de la fila: en la fila no cabía (robaba ancho a los inputs en
// móvil) y al arrancar cambiaba de tamaño, descuadrando el grid. Ver docs/DECISIONS.md.
function ExecutionTimer({ seconds }) {
  const { t } = useTranslation()
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
  const target = formatDuration(seconds)

  if (!isRunning && remaining === seconds) {
    return (
      <div className="mt-1 pl-1">
        <button
          onClick={handleStart}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:opacity-80"
          style={{ backgroundColor: colors.bgTertiary, border: 'none', cursor: 'pointer', color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}
          aria-label={t('workout:set.startTimer', { time: target })}
        >
          <Play size={12} color={colors.success} fill={colors.success} />
          {t('workout:set.startTimer', { time: target })}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-1 pl-1 flex items-center gap-2">
      <span
        className={`font-mono font-bold ${isCritical || isDone ? 'animate-pulse' : ''}`}
        style={{ color: isDone ? colors.success : isCritical ? colors.danger : colors.textPrimary, fontSize: 15 }}
      >
        {formatElapsedSeconds(remaining)}
      </span>
      <button
        onClick={handleStop}
        className="flex items-center hover:opacity-80"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: 4 }}
        aria-label={t('workout:set.stopTimer')}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default ExecutionTimer
