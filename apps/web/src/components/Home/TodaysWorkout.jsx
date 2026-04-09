import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dumbbell, Plus, Play, ChevronRight, Star } from 'lucide-react'
import { useRoutines, useNextRoutineDay } from '@gym/shared'
import { useStartSession } from '../../hooks/useWorkout.js'
import { Card } from '../ui/index.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { colors, gradients, design } from '../../lib/styles.js'

const iconBgStyle = (grad) => ({
  background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
  width: design.iconBgSize,
  height: design.iconBgSize,
  borderRadius: design.iconBgRadius,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
})

function TodaysWorkout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: routines } = useRoutines()
  const startSessionMutation = useStartSession()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const isFreeSessionActive = hasActiveSession && activeRoutineDayId === null
  const isRoutineSessionActive = hasActiveSession && activeRoutineDayId !== null

  const favoriteRoutine = routines?.find(r => r.is_favorite)
  const { nextDay, isLoading, isError } = useNextRoutineDay(favoriteRoutine?.id)

  const handleStartFreeWorkout = () => {
    startSessionMutation.mutate(undefined, {
      onSuccess: () => navigate('/workout/free'),
    })
  }

  const hasRoutines = routines && routines.length > 0

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ color: colors.textPrimary, fontSize: design.sectionTitleSize, fontWeight: 700, letterSpacing: -0.3 }}>
          {t('common:home.todaysWorkout')}
        </h2>
        {hasRoutines && (
          <button
            onClick={() => navigate('/routines')}
            style={{ color: colors.success, fontSize: 13, fontWeight: 500 }}
          >
            {t('common:buttons.seeAll')}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Next routine day OR create routine */}
        {favoriteRoutine && nextDay && !isLoading && !isError ? (
          <Card
            className="p-3"
            onClick={() => navigate(`/routine/${favoriteRoutine.id}/day/${nextDay.id}/workout`)}
            style={isRoutineSessionActive ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <div className="flex items-center gap-3">
              <div style={iconBgStyle(gradients.lime)}>
                <Dumbbell size={design.iconSize} style={{ color: colors.bgPrimary }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: 600 }}>
                  {nextDay.name}
                </h3>
                <p style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 2 }}>
                  {favoriteRoutine.name}
                  {nextDay.estimated_duration_min ? ` · ${nextDay.estimated_duration_min} min` : ''}
                </p>
              </div>
              <ChevronRight size={18} style={{ color: colors.textMuted }} />
            </div>
          </Card>
        ) : !hasRoutines ? (
          <Card
            className="p-3"
            onClick={() => navigate('/routines', { state: { openNewRoutine: true } })}
          >
            <div className="flex items-center gap-3">
              <div style={iconBgStyle(gradients.lime)}>
                <Plus size={design.iconSize} style={{ color: colors.bgPrimary }} />
              </div>
              <div className="flex-1">
                <h3 style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: 600 }}>
                  {t('common:home.createRoutine')}
                </h3>
                <p style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 2 }}>
                  {t('common:home.createRoutineDesc')}
                </p>
              </div>
              <ChevronRight size={18} style={{ color: colors.textMuted }} />
            </div>
          </Card>
        ) : !favoriteRoutine ? (
          <Card
            className="p-3"
            onClick={() => navigate('/routines')}
          >
            <div className="flex items-center gap-3">
              <div style={{ width: design.iconBgSize, height: design.iconBgSize, borderRadius: design.iconBgRadius, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: colors.bgTertiary }}>
                <Star size={design.iconSize} style={{ color: colors.textSecondary }} />
              </div>
              <div className="flex-1">
                <h3 style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: 600 }}>
                  {t('common:home.setupFavorite')}
                </h3>
                <p style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 2 }}>
                  {t('common:home.setupFavoriteDesc')}
                </p>
              </div>
              <ChevronRight size={18} style={{ color: colors.textMuted }} />
            </div>
          </Card>
        ) : null}

        {/* Free workout */}
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
            <div style={iconBgStyle(gradients.orange)}>
              <Play size={design.iconSize} style={{ color: colors.white }} />
            </div>
            <div className="flex-1">
              <h3 style={{ color: colors.textPrimary, fontSize: design.cardTitleSize, fontWeight: 600 }}>
                {isFreeSessionActive
                  ? t('workout:session.resume')
                  : t('common:home.freeWorkout')
                }
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 2 }}>
                {t('common:home.freeWorkoutDesc')}
              </p>
            </div>
            <ChevronRight size={18} style={{ color: colors.textMuted }} />
          </div>
        </Card>
      </div>
    </section>
  )
}

export default TodaysWorkout
