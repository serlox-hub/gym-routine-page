import { WorkoutExerciseCard } from './index.js'
import { colors } from '../../lib/styles.js'
import { translateBlockName } from '@gym/shared'

function FlatExerciseList({ exercises, onCompleteSet, onUncompleteSet, onRemove }) {
  return (
    <div className="space-y-3">
      {exercises.map((sessionExercise) => (
        <div key={sessionExercise.sessionExerciseId || sessionExercise.id}>
          {sessionExercise.is_extra && (
            <div
              className="text-xs font-medium px-2 py-0.5 rounded inline-block mb-1"
              style={{ backgroundColor: colors.purpleBg, color: colors.purple }}
            >
              {translateBlockName('Añadido')}
            </div>
          )}
          <WorkoutExerciseCard
            sessionExercise={sessionExercise}
            onCompleteSet={onCompleteSet}
            onUncompleteSet={onUncompleteSet}
            onRemove={onRemove}
          />
        </div>
      ))}
    </div>
  )
}

export default FlatExerciseList
