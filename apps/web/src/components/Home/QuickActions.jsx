import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Zap, Star } from 'lucide-react'
import { useStartSession } from '../../hooks/useWorkout.js'
import { Card } from '../ui/index.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { colors } from '../../lib/styles.js'

function QuickActions({ favoriteRoutine }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const startSessionMutation = useStartSession()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const isFreeSessionActive = hasActiveSession && activeRoutineDayId === null
  const isRoutineSessionActive = hasActiveSession && activeRoutineDayId !== null

  const handleStartFreeWorkout = () => {
    startSessionMutation.mutate(undefined, {
      onSuccess: () => navigate('/workout/free')
    })
  }

  return (
    <section className="mb-6">
      <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>{t('common:nav.quickAccess')}</h2>
      <div className="space-y-2">
        <Card
          className="p-3"
          onClick={
            isFreeSessionActive
              ? () => navigate('/workout/free')
              : isRoutineSessionActive
                ? undefined
                : !startSessionMutation.isPending
                  ? handleStartFreeWorkout
                  : undefined
          }
          style={isRoutineSessionActive ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.purpleAccentBg }}
            >
              <Zap size={20} style={{ color: colors.purpleAccent }} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm" style={{ color: colors.purpleAccent }}>
                {startSessionMutation.isPending
                  ? t('common:buttons.loading')
                  : isFreeSessionActive
                    ? t('workout:session.resume')
                    : t('workout:session.freeWorkout')}
              </h3>
              {isRoutineSessionActive && (
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  {t('workout:session.routineInProgress')}
                </p>
              )}
            </div>
          </div>
        </Card>

        {favoriteRoutine && (
          <Card
            className="p-3"
            onClick={() => navigate(`/routine/${favoriteRoutine.id}`)}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)' }}
              >
                <Star size={20} style={{ color: colors.warning }} fill={colors.warning} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm" style={{ color: colors.warning }}>
                  {favoriteRoutine.name}
                </h3>
              </div>
            </div>
          </Card>
        )}
      </div>
    </section>
  )
}

export default QuickActions
