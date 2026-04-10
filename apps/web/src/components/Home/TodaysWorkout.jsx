import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronRight, Pin, Repeat, Layers } from 'lucide-react'
import { useRoutines } from '@gym/shared'
import { useStartSession } from '../../hooks/useWorkout.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { colors, design } from '../../lib/styles.js'

function TodaysWorkout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: routines } = useRoutines()
  const startSessionMutation = useStartSession()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const isFreeSessionActive = hasActiveSession && activeRoutineDayId === null
  const isRoutineSessionActive = hasActiveSession && activeRoutineDayId !== null

  const pinnedRoutine = routines?.find(r => r.is_favorite)
  const hasRoutines = routines && routines.length > 0

  const handleStartFreeWorkout = () => {
    startSessionMutation.mutate(undefined, {
      onSuccess: () => navigate('/workout/free'),
    })
  }

  return (
    <section>
      <h2 style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
        {t('common:home.workout')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Pinned routine card */}
        {pinnedRoutine ? (
          <div
            onClick={() => navigate(`/routine/${pinnedRoutine.id}`)}
            className="cursor-pointer"
            style={{
              backgroundColor: colors.bgSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <Pin size={12} style={{ color: colors.success }} />
                  <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}>
                    {t('common:home.pinnedToHome')}
                  </span>
                </div>
                <h3 style={{ color: colors.textPrimary, fontSize: design.cardTitleSize + 1, fontWeight: 700 }}>
                  {pinnedRoutine.name}
                </h3>
                {pinnedRoutine.description && (
                  <p style={{ color: colors.textSecondary, fontSize: design.cardMetaSize, marginTop: 4, lineHeight: 1.4 }}>
                    {pinnedRoutine.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {pinnedRoutine.days_count > 0 && (
                    <span className="inline-flex items-center gap-1" style={{ backgroundColor: colors.bgAlt, borderRadius: 8, padding: '4px 8px', color: colors.textSecondary, fontSize: 10, fontWeight: 500 }}>
                      <Repeat size={11} />
                      {t('common:home.nDays', { count: pinnedRoutine.days_count })}
                    </span>
                  )}
                  {pinnedRoutine.exercises_count > 0 && (
                    <span className="inline-flex items-center gap-1" style={{ backgroundColor: colors.bgAlt, borderRadius: 8, padding: '4px 8px', color: colors.textSecondary, fontSize: 10, fontWeight: 500 }}>
                      <Layers size={11} />
                      {t('common:home.nExercises', { count: pinnedRoutine.exercises_count })}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} style={{ color: colors.textMuted, marginTop: 24 }} />
            </div>
          </div>

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
          onClick={
            isFreeSessionActive
              ? () => navigate('/workout/free')
              : isRoutineSessionActive
                ? undefined
                : !startSessionMutation.isPending
                  ? handleStartFreeWorkout
                  : undefined
          }
          className="flex items-center justify-center gap-2"
          style={{
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            height: 48,
            width: '100%',
            opacity: isRoutineSessionActive ? 0.5 : 1,
            cursor: isRoutineSessionActive ? 'not-allowed' : 'pointer',
          }}
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
