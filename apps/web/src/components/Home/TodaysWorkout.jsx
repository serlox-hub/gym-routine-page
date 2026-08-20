import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Pin, ChevronRight } from 'lucide-react'
import { useRoutines, useSelectedGym, getFreeWorkoutAction, WORKOUT_START_ACTION, getNotifier } from '@gym/shared'
import { useStartSession } from '../../hooks/useWorkout.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { RoutineCard } from '../Routine/index.js'
import { Skeleton } from '../ui/index.js'
import { colors, design } from '../../lib/styles.js'

function TodaysWorkout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: routines, isLoading: routinesLoading } = useRoutines()
  const { gymId } = useSelectedGym()
  const startSessionMutation = useStartSession()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const freeAction = getFreeWorkoutAction({
    hasActiveSession,
    routineDayId: activeRoutineDayId,
    isStarting: startSessionMutation.isPending,
  })
  const isFreeSessionActive = freeAction === WORKOUT_START_ACTION.RESUME
  const isRoutineSessionActive = freeAction === WORKOUT_START_ACTION.BLOCKED

  const pinnedRoutine = routines?.find(r => r.is_favorite)
  const hasRoutines = routines && routines.length > 0

  // Un botón que no responde y no dice nada parece roto. El caso BLOCKED (hay una sesión
  // de rutina en marcha) se explica con un aviso en vez de ignorar la pulsación.
  const handleFreeWorkoutPress = () => {
    switch (freeAction) {
      case WORKOUT_START_ACTION.RESUME:
        navigate('/workout/free')
        return
      case WORKOUT_START_ACTION.BLOCKED:
        getNotifier()?.show(t('workout:session.finishRoutineFirst'), 'info')
        return
      case WORKOUT_START_ACTION.START:
        startSessionMutation.mutate({ gymId }, {
          onSuccess: () => navigate('/workout/free'),
        })
        return
      case WORKOUT_START_ACTION.BUSY:
        return  // el arranque está en vuelo, ignorar la pulsación
    }
  }

  return (
    <section>
      <h2 style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
        {t('common:home.workout')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Loading skeleton */}
        {routinesLoading ? (
          <div
            style={{
              backgroundColor: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: design.routineCardRadius,
              padding: design.routineCardPadding,
              display: 'flex',
              flexDirection: 'column',
              gap: design.routineCardGap,
            }}
          >
            <Skeleton width="60%" height={18} />
            <Skeleton width="100%" height={28} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Skeleton width={80} height={22} />
              <Skeleton width={100} height={22} />
            </div>
          </div>
        ) : pinnedRoutine ? (
          <RoutineCard
            routine={pinnedRoutine}
            isPinned
            onClick={() => navigate(`/routine/${pinnedRoutine.id}`)}
          />

        ) : !hasRoutines ? (
          <button
            onClick={() => navigate('/routines', { state: { openNewRoutine: true } })}
            className="flex items-center justify-center gap-2"
            style={{
              backgroundColor: colors.success,
              borderRadius: 14,
              height: 48,
              width: '100%',
            }}
          >
            <Plus size={18} style={{ color: colors.bgPrimary }} />
            <span style={{ color: colors.bgPrimary, fontSize: design.cardTitleSize, fontWeight: 700 }}>
              {t('common:home.createRoutine')}
            </span>
          </button>

        ) : (
          <div
            onClick={() => navigate('/routines')}
            className="flex items-center cursor-pointer"
            style={{
              backgroundColor: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: '14px 16px',
              gap: 10,
            }}
          >
            <Pin size={18} style={{ color: colors.textMuted }} />
            <div className="flex-1">
              <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>
                {t('common:home.pinRoutine')}
              </span>
              <p style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                {t('common:home.pinRoutineDesc')}
              </p>
            </div>
            <ChevronRight size={18} style={{ color: colors.textMuted }} />
          </div>
        )}

        {/* Free workout button */}
        <button
          onClick={handleFreeWorkoutPress}
          className="flex items-center justify-center gap-2"
          style={{
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            height: 48,
            width: '100%',
            opacity: isRoutineSessionActive ? 0.5 : 1,
            cursor: 'pointer',
          }}
          onMouseEnter={!isRoutineSessionActive ? (e) => e.currentTarget.style.backgroundColor = colors.bgAlt : undefined}
          onMouseLeave={!isRoutineSessionActive ? (e) => e.currentTarget.style.backgroundColor = colors.bgSecondary : undefined}
        >
          <Plus size={16} style={{ color: colors.success }} />
          <span style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: 600 }}>
            {isFreeSessionActive
              ? t('workout:session.resume')
              : t('common:home.freeWorkout')
            }
          </span>
        </button>
      </div>
    </section>
  )
}

export default TodaysWorkout
