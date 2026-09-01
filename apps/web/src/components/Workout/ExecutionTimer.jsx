import { useTranslation } from 'react-i18next'
import { Play, X } from 'lucide-react'
import { formatDuration, formatElapsedSeconds, TIMER_BEEP_WINDOW_SECONDS } from '@gym/shared'
import { colors } from '../../lib/styles.js'
import { useExecutionTimer } from '../../hooks/useExecutionTimer.js'

// Cuenta atrás de la duración de la serie. Es un item de la SUBFILA compartida (SetRowMeta,
// junto a la referencia anterior y al aviso de progresión), no de la fila: dentro robaba ancho a
// los inputs en móvil y al arrancar cambiaba de tamaño, descuadrando el grid. Ver DECISIONS.
function ExecutionTimer({ seconds }) {
  const { t } = useTranslation()
  const { isRunning, remaining, start, stop } = useExecutionTimer(seconds)

  const isCritical = remaining <= TIMER_BEEP_WINDOW_SECONDS && remaining > 0
  const isDone = remaining === 0 && !isRunning
  const target = formatDuration(seconds)

  if (!isRunning && remaining === seconds) {
    return (
      <div>
        <button
          onClick={start}
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
    <div className="flex items-center gap-2">
      <span
        className={`font-mono font-bold ${isCritical || isDone ? 'animate-pulse' : ''}`}
        style={{ color: isDone ? colors.success : isCritical ? colors.danger : colors.textPrimary, fontSize: 15 }}
      >
        {formatElapsedSeconds(remaining)}
      </span>
      <button
        onClick={stop}
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
