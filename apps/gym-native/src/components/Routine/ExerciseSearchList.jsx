import { useState, useMemo, useEffect } from 'react'
import { View, Text, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { getMuscleGroupName, getEquipmentName, getExerciseName, filterExercises, getVisibleRecentExercises } from '@gym/shared'
import ExerciseSearchBar from '../Exercise/ExerciseSearchBar'
import ExerciseSearchRow from './ExerciseSearchRow'
import ExerciseSearchSectionTitle from './ExerciseSearchSectionTitle'

export default function ExerciseSearchList({
  exercises, muscleGroups, equipmentTypes, isLoading, onSelect, recentExercises = [],
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

  const renderRow = exercise => (
    <ExerciseSearchRow
      key={exercise.id}
      exercise={exercise}
      isInRoutine={existingExerciseIds.has(exercise.id)}
      onSelect={onSelect}
    />
  )

  // The list header, so Recent scrolls away with the list inside the same window.
  const recentSection = visibleRecentExercises.length > 0 ? (
    <View className="gap-2 mb-2">
      <ExerciseSearchSectionTitle>{t('exercise:picker.recent')}</ExerciseSearchSectionTitle>
      {visibleRecentExercises.map(renderRow)}
      <ExerciseSearchSectionTitle>{t('exercise:picker.allExercises')}</ExerciseSearchSectionTitle>
    </View>
  ) : null

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
      {isLoading ? (
        <Text className="text-secondary text-center py-4">{t('common:buttons.loading')}</Text>
      ) : filteredExercises.length === 0 ? (
        <Text className="text-secondary text-center py-4">{t('common:errors.notFound')}</Text>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => renderRow(item)}
          ListHeaderComponent={recentSection}
          ItemSeparatorComponent={() => <View className="h-2" />}
          style={{ maxHeight: 300 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </>
  )
}
