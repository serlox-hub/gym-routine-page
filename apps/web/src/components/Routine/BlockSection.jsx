import { useTranslation } from 'react-i18next'
import { Link2, Plus } from 'lucide-react'
import ExerciseCard from './ExerciseCard.jsx'
import { Card } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { formatSupersetLabel, groupExercisesBySupersetId, getExerciseName, translateBlockName } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'

function BlockSection({
  block,
  routineDayId,
  isEditing = false,
  isReordering = false,
  onAddExercise,
  onEditExercise,
  onReplaceExercise,
  onReorderExercise,
  onDeleteExercise,
  onDuplicateExercise,
  onMoveExerciseToDay,
}) {
  const { t } = useTranslation()
  const { name, duration_min, routine_exercises } = block
  const isWarmup = block.is_warmup || name.toLowerCase() === 'calentamiento'
  const exerciseGroups = groupExercisesBySupersetId(routine_exercises, name)
  const positionLabels = routine_exercises.map(re => getExerciseName(re.exercise))

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: colors.success }}
        >
          {translateBlockName(name)} ({routine_exercises.length})
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
                onReplace={() => onReplaceExercise?.(group.exercise)}
                onDelete={() => onDeleteExercise?.(group.exercise)}
                onDuplicate={() => onDuplicateExercise?.(group.exercise)}
                onMoveToDay={() => onMoveExerciseToDay?.(group.exercise)}
                onReorderToPosition={(newIndex) => onReorderExercise?.(group.exercise.id, newIndex)}
                currentIndex={index}
                totalExercises={routine_exercises.length}
                positionLabels={positionLabels}
              />
            )
          }
          // Superset - usar ID del primer ejercicio para key única
          const supersetLabel = formatSupersetLabel(group.supersetId)
          return (
            <Card
              key={`superset-${group.supersetId}-${group.exercises[0]?.id}`}
              className="p-0"
              style={{ border: `1px solid ${colors.purple}` }}
            >
              <div
                className="flex items-center gap-2 px-2 py-1 rounded-t-lg"
                style={{
                  backgroundColor: colors.purpleBg,
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
                    <div
                      key={exercise.id}
                      className="p-2"
                      style={getMuscleGroupBorderStyle(exercise.exercise?.muscle_group?.name)}
                    >
                      <ExerciseCard
                        routineExercise={exercise}
                        routineDayId={routineDayId}
                        isSuperset
                        isEditing={isEditing}
                        isReordering={isReordering}
                        onEdit={() => onEditExercise?.(exercise)}
                        onReplace={() => onReplaceExercise?.(exercise)}
                        onDelete={() => onDeleteExercise?.(exercise)}
                        onDuplicate={() => onDuplicateExercise?.(exercise)}
                        onMoveToDay={() => onMoveExerciseToDay?.(exercise)}
                        onReorderToPosition={(newIndex) => onReorderExercise?.(exercise.id, newIndex)}
                        currentIndex={index}
                        totalExercises={routine_exercises.length}
                        positionLabels={positionLabels}
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
            {isWarmup ? t('routine:block.addToWarmup') : t('routine:block.addExercise')}
          </button>
        )}
      </div>
    </section>
  )
}

export default BlockSection
