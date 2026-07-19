import { useTranslation } from 'react-i18next'
import { CircleMinus, CirclePlus, Clock } from 'lucide-react'
import SetRow, { GRID_WITH_RIR, GRID_NO_RIR } from './SetRow.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { usePreferences } from '../../hooks/usePreferences.js'
import { colors } from '../../lib/styles.js'
import { MeasurementType, formatRelativeDate } from '@gym/shared'

function SetsList({
  exerciseKey,
  exercise,
  setsCount,
  previousWorkout,
  measurementType,
  weightUnit,
  timeUnit,
  distanceUnit,
  rest_seconds,
  reps,
  onCompleteSet,
  onUncompleteSet,
  onRemoveSet,
  onAddSet,
}) {
  const { t } = useTranslation()
  const { data: preferences } = usePreferences()
  const showRirInput = preferences?.show_rir_input ?? true
  const completedSets = useWorkoutStore(state => state.completedSets)
  const showWeightReps = measurementType === MeasurementType.WEIGHT_REPS
  const activeSetNumber = (() => {
    for (let i = 1; i <= setsCount; i++) {
      if (!completedSets[`${exerciseKey}-${i}`]) return i
    }
    return null
  })()

  return (
    <>
      {/* Recencia de la referencia (la sesión anterior ahora se muestra inline por fila; ver
          PreviousSetCell). undefined = cargando; null = primera vez; objeto = fecha relativa. */}
      <div className="mt-3 mb-3">
        {previousWorkout === undefined ? (
          <div className="h-4 rounded w-40 animate-pulse" style={{ backgroundColor: colors.bgTertiary }} />
        ) : previousWorkout ? (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: colors.textSecondary }}>
            <Clock size={12} />
            <span>{t('workout:set.lastSession', { when: formatRelativeDate(previousWorkout.date) })}</span>
          </div>
        ) : (
          <div className="text-xs" style={{ color: colors.textSecondary }}>{t('workout:set.firstTime')}</div>
        )}
      </div>

      {/* Column headers (only for weight_reps) — grid desde las constantes de SetRow (fuente
          única) con la misma condición show_rir_input para colapsar la columna RIR */}
      {showWeightReps && setsCount > 0 && (
        <div className="grid items-center gap-2 mb-3 px-1" style={{ gridTemplateColumns: showRirInput ? GRID_WITH_RIR : GRID_NO_RIR }}>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {t('workout:set.set').toUpperCase()}
          </span>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {t('workout:set.previous').toUpperCase()}
          </span>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {weightUnit?.toUpperCase() || 'KG'}
          </span>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {t('workout:set.reps').toUpperCase()}
          </span>
          {showRirInput && (
            <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
              {t('workout:set.rir').toUpperCase()}
            </span>
          )}
          <span />
        </div>
      )}

      <div className="space-y-2">
        {Array.from({ length: setsCount }, (_, i) => {
          const previousSet = previousWorkout?.sets?.find(s => s.setNumber === i + 1)
          return (
            <SetRow
              key={`${exerciseKey}-${i + 1}`}
              setNumber={i + 1}
              totalSets={setsCount}
              exerciseName={exercise.name}
              sessionExerciseId={exerciseKey}
              exerciseId={exercise.id}
              measurementType={measurementType}
              weightUnit={weightUnit}
              timeUnit={timeUnit}
              distanceUnit={distanceUnit}
              descansoSeg={rest_seconds}
              previousSet={previousSet}
              repsTarget={reps}
              isActive={activeSetNumber === i + 1}
              onComplete={onCompleteSet}
              onUncomplete={onUncompleteSet}
            />
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-4">
        {setsCount > 0 && (
          <button onClick={onRemoveSet}
            className="flex items-center gap-1.5 hover:opacity-80"
            style={{ color: colors.textSecondary, fontSize: 13 }}>
            <CircleMinus size={16} />
            {t('workout:set.removeLast')}
          </button>
        )}
        {onAddSet && (
          <button onClick={onAddSet}
            className="flex items-center gap-1.5 hover:opacity-80"
            style={{ color: colors.success, fontSize: 13, fontWeight: 600 }}>
            <CirclePlus size={16} />
            {t('workout:set.addSet')}
          </button>
        )}
      </div>
    </>
  )
}

export default SetsList
