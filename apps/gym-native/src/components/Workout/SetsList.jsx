import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { CircleMinus, CirclePlus } from 'lucide-react-native'
import SetRow from './SetRow'
import PreviousWorkout from './PreviousWorkout'
import useWorkoutStore from '../../stores/workoutStore'
import { colors } from '../../lib/styles'
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
  reps,
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
      <View style={{ marginTop: 12, marginBottom: 20 }}>
        <PreviousWorkout exerciseId={exercise.id} measurementType={measurementType} weightUnit={weightUnit} timeUnit={timeUnit} distanceUnit={distanceUnit} />
      </View>

      {showWeightReps && setsCount > 0 && (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ width: 48, textAlign: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 }}>
            {t('workout:set.set').toUpperCase()}
          </Text>
          <Text style={{ flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 }}>
            {weightUnit?.toUpperCase() || 'KG'}
          </Text>
          <Text style={{ flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 }}>
            {t('workout:set.reps').toUpperCase()}
          </Text>
          <View style={{ width: 132 }} />
        </View>
      )}

      <View style={{ gap: 8 }}>
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
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 16 }}>
        {setsCount > 0 && (
          <Pressable onPress={onRemoveSet}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            className="active:opacity-70">
            <CircleMinus size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('workout:set.removeLast')}</Text>
          </Pressable>
        )}
        {onAddSet && (
          <Pressable onPress={onAddSet}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            className="active:opacity-70">
            <CirclePlus size={16} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: 13, fontWeight: '600' }}>{t('workout:set.addSet')}</Text>
          </Pressable>
        )}
      </View>
    </>
  )
}

export default SetsList
