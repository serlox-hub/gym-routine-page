import { Flame, Link2, Dumbbell, Plus } from 'lucide-react'
import ExerciseCard from './ExerciseCard.jsx'
import { Card } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { groupExercisesBySupersetId } from '../../lib/workoutTransforms.js'
import { formatSupersetLabel } from '../../lib/supersetUtils.js'

function BlockSection({
  block,
  routineDayId,
  isEditing = false,
  isReordering = false,
  onAddExercise,
  onEditExercise,
  onMoveExercise,
  onDeleteExercise,
  canMoveUp = false
}) {
  const { name, duration_min, routine_exercises } = block
  const isWarmup = name.toLowerCase() === 'calentamiento'
  const exerciseGroups = groupExercisesBySupersetId(routine_exercises, name)

  return (
    <section className="space-y-2">
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded border-l-2"
        style={{
          backgroundColor: colors.bgTertiary,
          borderLeftColor: isWarmup ? colors.warning : colors.purple,
        }}
      >
        {isWarmup ? (
          <Flame size={12} style={{ color: colors.warning }} />
        ) : (
          <Dumbbell size={12} style={{ color: colors.purple }} />
        )}
        <span
          className="text-xs font-medium uppercase"
          style={{ color: isWarmup ? colors.warning : colors.purple }}
        >
          {name}
        </span>
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
            const index = routine_exercises.findIndex(re => re.id === group.exercise.id)
            return (
              <ExerciseCard
                key={group.exercise.id}
                routineExercise={group.exercise}
                routineDayId={routineDayId}
                isEditing={isEditing}
                isReordering={isReordering}
                onEdit={() => onEditExercise?.(group.exercise)}
                onMoveUp={() => onMoveExercise?.(group.exercise.id, 'up')}
                onMoveDown={() => onMoveExercise?.(group.exercise.id, 'down')}
                onDelete={() => onDeleteExercise?.(group.exercise)}
                canMoveUp={index > 0 || canMoveUp}
                canMoveDown={index < routine_exercises.length - 1}
              />
            )
          }
          // Superset
          const supersetLabel = formatSupersetLabel(group.supersetId)
          return (
            <Card
              key={`superset-${group.supersetId}`}
              className="p-0"
              style={{ border: `1px solid ${colors.purple}` }}
            >
              <div
                className="flex items-center gap-2 px-2 py-1 rounded-t-lg"
                style={{
                  backgroundColor: 'rgba(163, 113, 247, 0.1)',
                  borderBottom: `1px solid ${colors.purple}`,
                }}
              >
                <Link2 size={12} style={{ color: colors.purple }} />
                <span className="text-xs font-medium" style={{ color: colors.purple }}>
                  {supersetLabel}
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: colors.border }}>
                {group.exercises.map((exercise) => {
                  const index = routine_exercises.findIndex(re => re.id === exercise.id)
                  return (
                    <div key={exercise.id} className="p-2">
                      <ExerciseCard
                        routineExercise={exercise}
                        routineDayId={routineDayId}
                        isSuperset
                        isEditing={isEditing}
                        isReordering={isReordering}
                        onEdit={() => onEditExercise?.(exercise)}
                        onMoveUp={() => onMoveExercise?.(exercise.id, 'up')}
                        onMoveDown={() => onMoveExercise?.(exercise.id, 'down')}
                        onDelete={() => onDeleteExercise?.(exercise)}
                        canMoveUp={index > 0 || canMoveUp}
                        canMoveDown={index < routine_exercises.length - 1}
                      />
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
        {isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddExercise?.() }}
            className="w-full py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ border: `1px dashed ${colors.border}`, color: isWarmup ? colors.warning : colors.purple }}
          >
            <Plus size={14} />
            Añadir {isWarmup ? 'calentamiento' : 'ejercicio'}
          </button>
        )}
      </div>
    </section>
  )
}

export default BlockSection
