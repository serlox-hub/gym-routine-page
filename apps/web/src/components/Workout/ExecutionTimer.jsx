import { useTranslation } from 'react-i18next'
import { Play, X } from 'lucide-react'
import { formatDuration, formatElapsedSeconds, TIMER_BEEP_WINDOW_SECONDS } from '@gym/shared'
import { colors } from '../../lib/styles.js'
import { IconButton } from '../ui/index.js'
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
    // The button is the 44px box; the pill inside keeps its size. `-my-2` (see SetRowMeta) goes on
    // the subrow's direct child, like on native.
    return (
      <div className="-my-2">
        <button
          onClick={start}
          className="min-h-11 flex items-center hover:opacity-80"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          aria-label={t('workout:set.startTimer', { time: target })}
        >
          <span
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}
          >
            <Play size={12} color={colors.success} fill={colors.success} />
            {t('workout:set.startTimer', { time: target })}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 -my-2">
      <span
        className={`font-mono font-bold ${isCritical || isDone ? 'animate-pulse' : ''}`}
        style={{ color: isDone ? colors.success : isCritical ? colors.danger : colors.textPrimary, fontSize: 15 }}
      >
        {formatElapsedSeconds(remaining)}
      </span>
      <IconButton icon={X} iconSize={14} label={t('workout:set.stopTimer')} onClick={stop} />
    </div>
  )
}

export default ExecutionTimer
