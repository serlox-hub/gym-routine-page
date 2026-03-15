import { Link2 } from 'lucide-react'
import { Card } from '../ui/index.js'
import WorkoutExerciseCard from './WorkoutExerciseCard.jsx'
import { colors } from '../../lib/styles.js'
import { formatSupersetLabel } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'

function SupersetCard({ exercises, supersetId, onCompleteSet, onUncompleteSet, onRemove, onReplace, getReorderProps }) {
  const supersetLabel = formatSupersetLabel(supersetId)

  return (
    <Card
      className="p-0"
      style={{
        border: `1px solid ${colors.purple}`,
      }}
    >
      {/* Header del superset */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{
          backgroundColor: 'rgba(163, 113, 247, 0.1)',
          borderBottom: `1px solid ${colors.purple}`,
        }}
      >
        <Link2 size={14} style={{ color: colors.purple }} />
        <span
          className="text-xs font-medium"
          style={{ color: colors.purple }}
        >
          {supersetLabel}
        </span>
        <span
          className="text-xs"
          style={{ color: colors.textSecondary }}
        >
          ({exercises.length} ejercicios)
        </span>
      </div>

      {/* Ejercicios del superset */}
      <div className="divide-y" style={{ borderColor: colors.border }}>
        {exercises.map((sessionExercise, index) => (
          <div
            key={sessionExercise.sessionExerciseId || sessionExercise.id}
            className="p-4"
            style={getMuscleGroupBorderStyle(sessionExercise.exercise?.muscle_group?.name)}
          >
            <SupersetExerciseItem
              sessionExercise={sessionExercise}
              isLast={index === exercises.length - 1}
              onCompleteSet={onCompleteSet}
              onUncompleteSet={onUncompleteSet}
              onRemove={onRemove}
              onReplace={onReplace}
              reorderProps={getReorderProps?.(sessionExercise) || {}}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}

function SupersetExerciseItem({ sessionExercise, isLast, onCompleteSet, onUncompleteSet, onRemove, onReplace, reorderProps }) {
  return (
    <WorkoutExerciseCard
      sessionExercise={sessionExercise}
      onCompleteSet={onCompleteSet}
      onUncompleteSet={onUncompleteSet}
      onRemove={onRemove}
      onReplace={onReplace}
      isSuperset={true}
      isLastInSuperset={isLast}
      {...reorderProps}
    />
  )
}

export default SupersetCard
