import { useTranslation } from 'react-i18next'
import { CircleMinus, CirclePlus } from 'lucide-react'
import SetRow from './SetRow.jsx'
import PreviousWorkout from './PreviousWorkout.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { colors } from '../../lib/styles.js'
import { MeasurementType } from '@gym/shared'

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
  onCompleteSet,
  onUncompleteSet,
  onRemoveSet,
  onAddSet,
}) {
  const { t } = useTranslation()
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
      <div className="mt-3 mb-5">
        <PreviousWorkout exerciseId={exercise.id} measurementType={measurementType} weightUnit={weightUnit} timeUnit={timeUnit} distanceUnit={distanceUnit} />
      </div>

      {/* Column headers (only for weight_reps) */}
      {showWeightReps && setsCount > 0 && (
        <div className="grid items-center gap-3 mb-3 px-1" style={{ gridTemplateColumns: '48px 1fr 1fr 132px' }}>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {t('workout:set.set').toUpperCase()}
          </span>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {weightUnit?.toUpperCase() || 'KG'}
          </span>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textAlign: 'center' }}>
            {t('workout:set.reps').toUpperCase()}
          </span>
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
