import { WorkoutExerciseCard } from './index.js'
import { colors } from '../../lib/styles.js'

function FlatExerciseList({ exercises, onCompleteSet, onUncompleteSet, onRemove }) {
  return (
    <div className="space-y-3">
      {exercises.map((routineExercise) => (
        <div key={routineExercise.id}>
          {routineExercise.type === 'extra' && (
            <div
              className="text-xs font-medium px-2 py-0.5 rounded inline-block mb-1"
              style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)', color: colors.purple }}
            >
              Añadido
            </div>
          )}
          <WorkoutExerciseCard
            routineExercise={routineExercise}
            onCompleteSet={onCompleteSet}
            onUncompleteSet={onUncompleteSet}
            onRemove={onRemove}
            isWarmup={routineExercise.isWarmup}
          />
        </div>
      ))}
    </div>
  )
}

export default FlatExerciseList
