import { View } from 'react-native'
import SetRow from './SetRow'
import PreviousWorkout from './PreviousWorkout'

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
}) {
  return (
    <>
      <View className="mb-3">
        <PreviousWorkout exerciseId={exercise.id} measurementType={measurementType} timeUnit={timeUnit} distanceUnit={distanceUnit} />
      </View>

      <View className="gap-2">
        {Array.from({ length: setsCount }, (_, i) => {
          const previousSet = previousWorkout?.sets?.find(s => s.setNumber === i + 1)
          return (
            <SetRow
              key={`${exerciseKey}-${i + 1}`}
              setNumber={i + 1}
              sessionExerciseId={exerciseKey}
              exerciseId={exercise.id}
              measurementType={measurementType}
              weightUnit={weightUnit}
              timeUnit={timeUnit}
              distanceUnit={distanceUnit}
              descansoSeg={rest_seconds}
              previousSet={previousSet}
              onComplete={onCompleteSet}
              onUncomplete={onUncompleteSet}
              canRemove={setsCount > 0}
              onRemove={onRemoveSet}
            />
          )
        })}
      </View>
    </>
  )
}

export default SetsList
