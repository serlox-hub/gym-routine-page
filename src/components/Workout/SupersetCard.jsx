import { Link2 } from 'lucide-react'
import { Card } from '../ui/index.js'
import WorkoutExerciseCard from './WorkoutExerciseCard.jsx'
import { colors } from '../../lib/styles.js'
import { formatSupersetLabel } from '../../lib/supersetUtils.js'

function SupersetCard({ exercises, supersetId, onCompleteSet, onUncompleteSet, onRemove }) {
  const supersetLabel = formatSupersetLabel(supersetId)

  return (
    <Card
      className="p-0 overflow-hidden"
      style={{
        border: `1px solid ${colors.purple}`,
      }}
    >
      {/* Header del superset */}
      <div
        className="flex items-center gap-2 px-3 py-2"
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
          <div key={sessionExercise.sessionExerciseId || sessionExercise.id} className="p-4">
            <SupersetExerciseItem
              sessionExercise={sessionExercise}
              isLast={index === exercises.length - 1}
              onCompleteSet={onCompleteSet}
              onUncompleteSet={onUncompleteSet}
              onRemove={onRemove}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}

function SupersetExerciseItem({ sessionExercise, isLast, onCompleteSet, onUncompleteSet, onRemove }) {
  // Usar el WorkoutExerciseCard pero indicando que es parte de superset
  // El timer solo se activa si rest_seconds está configurado
  return (
    <WorkoutExerciseCard
      sessionExercise={sessionExercise}
      onCompleteSet={onCompleteSet}
      onUncompleteSet={onUncompleteSet}
      onRemove={onRemove}
      isSuperset={true}
      isLastInSuperset={isLast}
    />
  )
}

export default SupersetCard
