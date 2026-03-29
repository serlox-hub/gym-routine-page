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
  const timerColor = isCritical ? colors.danger : isWarning ? colors.warning : colors.white

  return (
    <div
      className="fixed z-50 select-none"
      style={{ top: 8, left: '50%', ...dragStyle }}
      {...dragProps}
    >
      <div
        className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg shadow-lg"
        style={{ backgroundColor: colors.bgSecondary, border: `2px solid ${colors.accent}` }}
      >
        <span className="text-xs font-medium" style={{ color: colors.accent }}>
          {t('workout:session.active')}
        </span>
        {restTimerActive && (
          <span
            className={`font-mono font-bold text-lg ${isCritical ? 'animate-pulse' : ''}`}
            style={{ color: timerColor }}
          >
            {formatSecondsToMMSS(timeRemaining)}
          </span>
        )}
        <button
          onClick={handleContinue}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer"
          style={{ backgroundColor: colors.actionPrimaryBg, color: colors.white }}
        >
          <Play size={14} fill={colors.white} />
          {t('common:buttons.back')}
        </button>
      </div>
    </div>
  )
}

export default ActiveSessionBanner
