import SetRow from './SetRow.jsx'
import PreviousWorkout from './PreviousWorkout.jsx'

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
      <div className="mb-3">
        <PreviousWorkout exerciseId={exercise.id} measurementType={measurementType} weightUnit={weightUnit} timeUnit={timeUnit} distanceUnit={distanceUnit} />
      </div>

      <div className="space-y-2">
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
      </div>
    </>
  )
}

export default SetsList
