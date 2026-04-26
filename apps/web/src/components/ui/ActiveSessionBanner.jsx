import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { useRestTimer } from '../../hooks/useWorkout.js'
import { useDraggable } from '../../hooks/useDrag.js'
import { formatSecondsToMMSS } from '@gym/shared'

function ActiveSessionBanner() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const routineId = useWorkoutStore(state => state.routineId)

  const { isActive: restTimerActive, timeRemaining } = useRestTimer()
  const { dragProps, dragStyle, wasDragged } = useDraggable()

  if (!sessionId) return null

  const isOnWorkoutPage = location.pathname.includes('/workout')
  if (isOnWorkoutPage) return null

  const handleContinue = () => {
    if (wasDragged.current) return
    if (routineDayId && routineId) {
      navigate(`/routine/${routineId}/day/${routineDayId}/workout`)
    } else {
      navigate('/workout/free')
    }
  }

  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3
  const timerColor = isCritical ? colors.danger : isWarning ? colors.warning : colors.success

  return (
    <div
      className="fixed z-50 select-none"
      style={{ top: 12, left: '50%', ...dragStyle }}
      {...dragProps}
    >
      <button
        onClick={handleContinue}
        className="flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.borderSubtle}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
            {t('workout:session.active')}
          </span>
          {restTimerActive && timeRemaining > 0 && (
            <span
              className={`font-mono font-bold text-sm ${isCritical ? 'animate-pulse' : ''}`}
              style={{ color: timerColor, fontVariantNumeric: 'tabular-nums' }}
            >
              {formatSecondsToMMSS(timeRemaining)}
            </span>
          )}
        </div>
        <span
          className="flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, backgroundColor: colors.success }}
        >
          <Play size={14} color={colors.bgPrimary} fill={colors.bgPrimary} />
        </span>
      </button>
    </div>
  )
}

export default ActiveSessionBanner
