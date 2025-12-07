import { Flame, Link2 } from 'lucide-react'
import ExerciseCard from './ExerciseCard.jsx'
import { Card } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { groupExercisesBySupersetId } from '../../lib/workoutTransforms.js'
import { formatSupersetLabel } from '../../lib/supersetUtils.js'

function BlockSection({ block }) {
  const { name, duration_min, routine_exercises } = block
  const isWarmup = name.toLowerCase() === 'calentamiento'
  const exerciseGroups = groupExercisesBySupersetId(routine_exercises, name)

  return (
    <section className="space-y-3">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border-l-4"
        style={{
          backgroundColor: colors.bgTertiary,
          borderLeftColor: isWarmup ? colors.warning : colors.purple,
        }}
      >
        {isWarmup && <Flame size={16} style={{ color: colors.warning }} />}
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: isWarmup ? colors.warning : colors.purple }}
        >
          {name}
        </h3>
        <span className="text-xs" style={{ color: colors.textSecondary }}>
          ({routine_exercises.length})
        </span>
        {duration_min && (
          <span className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
            ~{duration_min} min
          </span>
        )}
      </div>
      <div className="space-y-2">
        {exerciseGroups.map(group => {
          if (group.type === 'individual') {
            return (
              <ExerciseCard
                key={group.exercise.id}
                routineExercise={group.exercise}
                isWarmup={isWarmup}
              />
            )
          }
          // Superset
          const supersetLabel = formatSupersetLabel(group.supersetId)
          return (
            <Card
              key={`superset-${group.supersetId}`}
              className="p-0 overflow-hidden"
              style={{ border: `1px solid ${colors.purple}` }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{
                  backgroundColor: 'rgba(163, 113, 247, 0.1)',
                  borderBottom: `1px solid ${colors.purple}`,
                }}
              >
                <Link2 size={14} style={{ color: colors.purple }} />
                <span className="text-xs font-medium" style={{ color: colors.purple }}>
                  {supersetLabel}
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: colors.border }}>
                {group.exercises.map(exercise => (
                  <div key={exercise.id} className="p-3">
                    <ExerciseCard
                      routineExercise={exercise}
                      isWarmup={isWarmup}
                      isSuperset
                    />
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

export default BlockSection
