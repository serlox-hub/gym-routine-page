import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'
import {
  getMuscleGroupName, getEquipmentName, getExerciseName, filterExercises, getVisibleRecentExercises, shouldOfferClearFilters,
} from '@gym/shared'
import ExerciseSearchBar from '../Exercise/ExerciseSearchBar.jsx'
import ExerciseSearchRow from './ExerciseSearchRow.jsx'
import ExerciseSearchSectionTitle from './ExerciseSearchSectionTitle.jsx'
import ExerciseSearchEmptyState from './ExerciseSearchEmptyState.jsx'

function ExerciseSearchList({
  exercises, muscleGroups, equipmentTypes, isLoading, onSelect, recentExercises = [],
  existingExerciseIds = new Set(), search = '', onSearchChange, initialMuscleGroup = null, inputRef,
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

  const filters = useMemo(
    () => ({
      search: currentSearch,
      muscleGroupId: selectedMuscleGroup,
      equipmentTypeId: selectedEquipmentType,
      sourceFilter,
      getName: getExerciseName,
      getMuscleGroupText: e => getMuscleGroupName(e.muscle_group),
      getEquipmentText: e => getEquipmentName(e.equipment_type),
    }),
    [currentSearch, selectedMuscleGroup, selectedEquipmentType, sourceFilter]
  )

  const filteredExercises = useMemo(() => filterExercises(exercises, filters), [exercises, filters])
  const visibleRecentExercises = useMemo(
    () => getVisibleRecentExercises(recentExercises, filters),
    [recentExercises, filters]
  )
  const offerClearFilters = useMemo(
    () => filteredExercises.length === 0 && shouldOfferClearFilters(exercises, filters),
    [filteredExercises, exercises, filters]
  )

  // Clears every filter, the muscle group included, and keeps the search text.
  const handleClearFilters = () => {
    setSelectedMuscleGroup(null)
    setSelectedEquipmentType(null)
    setSourceFilter('all')
  }

  const showRecent = visibleRecentExercises.length > 0
  // Under the section titles (h4) the names go one level down. Without them they sit right under
  // the modal's title (h3), as they did before the section existed.
  const nameAs = showRecent ? 'h5' : 'h4'

  const renderRow = exercise => (
    <ExerciseSearchRow
      key={exercise.id}
      exercise={exercise}
      isInRoutine={existingExerciseIds.has(exercise.id)}
      onSelect={onSelect}
      nameAs={nameAs}
    />
  )

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
        resultCount={exercises ? filteredExercises.length : null}
        autoFocus
        inputRef={inputRef}
      />

      {/* One scroll area for both sections, so Recent scrolls away with the list. */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {isLoading ? (
          <p className="text-center py-4" style={{ color: colors.textSecondary }}>
            {t('common:buttons.loading')}
          </p>
        ) : (
          <>
            {showRecent && (
              <>
                <ExerciseSearchSectionTitle>{t('exercise:picker.recent')}</ExerciseSearchSectionTitle>
                {visibleRecentExercises.map(renderRow)}
                <ExerciseSearchSectionTitle>{t('exercise:picker.allExercises')}</ExerciseSearchSectionTitle>
              </>
            )}
            {filteredExercises.length === 0 ? (
              <ExerciseSearchEmptyState onClearFilters={offerClearFilters ? handleClearFilters : null} />
            ) : (
              filteredExercises.map(renderRow)
            )}
          </>
        )}
      </div>
    </>
  )
}

export default ExerciseSearchList
