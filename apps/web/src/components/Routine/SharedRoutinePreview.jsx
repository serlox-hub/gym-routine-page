import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2 } from 'lucide-react'
import {
  formatExercisePrescription,
  formatSupersetLabel,
  getExerciseName,
  getMuscleGroupName,
} from '@gym/shared'
import { Card, ExerciseName } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

/**
 * Read-only view of a shared routine (`/r/:token`), built from the export JSON alone. The visitor may
 * have no session, so `DayCard`/`ExerciseCard`, which load their data per id with the owner's
 * session, cannot be reused. `muscleGroups` is the public catalog, used only to localize names.
 */
function SharedRoutinePreview({ preview, muscleGroups = [] }) {
  const { t } = useTranslation()
  const muscleGroupsByName = useMemo(
    () => new Map(muscleGroups.map(group => [group.name, group])),
    [muscleGroups]
  )

  const muscleGroupLabel = (name) => {
    if (!name) return ''
    const group = muscleGroupsByName.get(name)
    return group ? getMuscleGroupName(group) : name
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>{preview.name}</h1>
        {preview.description && (
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>{preview.description}</p>
        )}
      </div>

      {preview.days.map(day => (
        <Card key={day.key} className="p-4">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>{day.name}</h2>
            {day.estimatedDurationMin != null && (
              <span className="text-xs shrink-0" style={{ color: colors.textMuted }}>
                {t('routine:shareLink.duration', { minutes: day.estimatedDurationMin })}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {day.blocks.map(block => (
              <section key={block.isWarmup ? 'warmup' : 'main'}>
                <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: colors.textMuted }}>
                  {t(block.isWarmup ? 'routine:block.warmup' : 'routine:block.main')}
                </h3>
                <div className="flex flex-col gap-2">
                  {block.units.map((unit, unitIndex) => (
                    <div
                      key={unitIndex}
                      className="flex flex-col gap-2 rounded-lg"
                      style={unit.supersetGroup !== null
                        ? { border: `1px solid ${colors.purple}`, backgroundColor: colors.purpleBg, padding: 8 }
                        : undefined}
                    >
                      {unit.supersetGroup !== null && (
                        <div className="flex items-center gap-1.5">
                          <Link2 size={12} style={{ color: colors.purple }} />
                          <span className="text-xs font-medium" style={{ color: colors.purple }}>
                            {formatSupersetLabel(unit.supersetGroup)}
                          </span>
                        </div>
                      )}
                      {unit.exercises.map((exercise, exerciseIndex) => (
                        <div key={exerciseIndex} className="rounded-lg px-3 py-2" style={{ backgroundColor: colors.bgTertiary }}>
                          <ExerciseName as="h4" fontSize={14}>{getExerciseName(exercise.catalog)}</ExerciseName>
                          {exercise.catalog.muscle_group_name && (
                            <p className="text-xs" style={{ color: colors.textMuted }}>
                              {muscleGroupLabel(exercise.catalog.muscle_group_name)}
                            </p>
                          )}
                          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                            {formatExercisePrescription(exercise, exercise.catalog.tracked_fields)}
                          </p>
                          {exercise.notes && (
                            <p className="text-xs mt-1 italic" style={{ color: colors.textMuted }}>{exercise.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default SharedRoutinePreview
