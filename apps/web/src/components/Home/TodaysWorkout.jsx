import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Pin, ChevronRight } from 'lucide-react'
import { useRoutines } from '@gym/shared'
import { useStartSession } from '../../hooks/useWorkout.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { RoutineCard } from '../Routine/index.js'
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
