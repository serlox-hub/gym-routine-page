import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { getMuscleGroupColor, getMuscleGroupName, getEquipmentName, getExerciseName, normalizeSearchText } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'
import { Card } from '../ui/index.js'
import ExerciseSearchBar from '../Exercise/ExerciseSearchBar.jsx'

function ExerciseSearchList({
  exercises, muscleGroups, equipmentTypes, isLoading, onSelect,
  existingExerciseIds = new Set(), search = '', onSearchChange, initialMuscleGroup = null,
}) {
  const { t } = useTranslation()
  const [internalSearch, setInternalSearch] = useState(search)
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(initialMuscleGroup)
  const [selectedEquipmentType, setSelectedEquipmentType] = useState(null)
  const [sourceFilter, setSourceFilter] = useState('all')

  useEffect(() => {
    setSelectedMuscleGroup(initialMuscleGroup)
  }, [initialMuscleGroup])

  const currentSearch = onSearchChange ? search : internalSearch
  const handleSearchChange = onSearchChange || setInternalSearch

  const filteredExercises = useMemo(() => {
    if (!exercises) return []
    return exercises.filter(ex => {
      const matchesSearch = normalizeSearchText(getExerciseName(ex)).includes(normalizeSearchText(currentSearch))
      const matchesMuscle = !selectedMuscleGroup || ex.muscle_group_id === selectedMuscleGroup
      const matchesEquipment = !selectedEquipmentType || ex.equipment_type?.id === selectedEquipmentType
      const matchesSource = sourceFilter === 'all' || (sourceFilter === 'custom' ? !ex.is_system : ex.is_system)
      return matchesSearch && matchesMuscle && matchesEquipment && matchesSource
    })
  }, [exercises, currentSearch, selectedMuscleGroup, selectedEquipmentType, sourceFilter])

  return (
    <>
      <ExerciseSearchBar
        search={currentSearch}
        onSearchChange={handleSearchChange}
        muscleGroups={muscleGroups}
        selectedMuscleGroup={selectedMuscleGroup}
        onMuscleGroupChange={setSelectedMuscleGroup}
        equipmentTypes={equipmentTypes}
        selectedEquipmentType={selectedEquipmentType}
        onEquipmentTypeChange={setSelectedEquipmentType}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        autoFocus
      />

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {isLoading ? (
          <p className="text-center py-4" style={{ color: colors.textSecondary }}>
            {t('common:buttons.loading')}
          </p>
        ) : filteredExercises.length === 0 ? (
          <p className="text-center py-4" style={{ color: colors.textSecondary }}>
            {t('common:errors.notFound')}
          </p>
        ) : (
          filteredExercises.map(exercise => {
            const isInRoutine = existingExerciseIds.has(exercise.id)
            return (
              <button
                key={exercise.id}
                onClick={() => onSelect(exercise)}
                className="w-full text-left"
              >
                <Card className="p-3 transition-colors hover:opacity-90" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate" style={{ color: colors.textPrimary }}>
                        {getExerciseName(exercise)}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <ExerciseBadge
                          label={getMuscleGroupName(exercise.muscle_group)}
                          dot={getMuscleGroupColor(exercise.muscle_group?.name)}
                        />
                        {exercise.equipment_type && (
                          <ExerciseBadge label={getEquipmentName(exercise.equipment_type)} />
                        )}
                        {!exercise.is_system && (
                          <ExerciseBadge label={t('exercise:custom')} accent />
                        )}
                      </div>
                    </div>
                    {isInRoutine && (
                      <span
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)', color: colors.success }}
                      >
                        <Check size={12} />
                        {t('routine:exercise.inRoutine')}
                      </span>
                    )}
                  </div>
                </Card>
              </button>
            )
          })
        )}
      </div>
    </>
  )
}

function ExerciseBadge({ label, dot, accent }) {
  if (!label) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
      style={{
        backgroundColor: accent ? colors.accentBgSubtle : colors.bgTertiary,
        color: accent ? colors.accent : colors.textSecondary,
      }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />}
      {label}
    </span>
  )
}

export default ExerciseSearchList
