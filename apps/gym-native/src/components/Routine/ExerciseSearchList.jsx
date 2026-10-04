import { useState, useMemo, useEffect } from 'react'
import { View, Text, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  getMuscleGroupName, getEquipmentName, getExerciseName, filterExercises, getVisibleRecentExercises, shouldOfferClearFilters,
} from '@gym/shared'
import ExerciseSearchBar from '../Exercise/ExerciseSearchBar'
import ExerciseSearchRow from './ExerciseSearchRow'
import ExerciseSearchSectionTitle from './ExerciseSearchSectionTitle'
import ExerciseSearchEmptyState from './ExerciseSearchEmptyState'

// The list is what gives up height when the sheet reaches its cap (a 4.7" phone, the replace flow
// with its subtitle), so the footer stays on screen. Enough to show there is something to scroll.
// Never more than the content: a one-row result would otherwise leave an empty band above the
// footer, which web (whose list hugs its content) does not have.
const LIST_MIN_HEIGHT = 120

export default function ExerciseSearchList({
  exercises, muscleGroups, equipmentTypes, isLoading, onSelect, recentExercises = [],
  existingExerciseIds = new Set(), search = '', onSearchChange, initialMuscleGroup = null,
}) {
  const { t } = useTranslation()
  const [internalSearch, setInternalSearch] = useState(search)
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(initialMuscleGroup)
  const [selectedEquipmentType, setSelectedEquipmentType] = useState(null)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [listMinHeight, setListMinHeight] = useState(LIST_MIN_HEIGHT)

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
        resultCount={exercises ? filteredExercises.length : null}
        autoFocus
      />
      {isLoading ? (
        <Text className="text-secondary text-center py-4">{t('common:buttons.loading')}</Text>
      ) : filteredExercises.length === 0 ? (
        <ExerciseSearchEmptyState onClearFilters={offerClearFilters ? handleClearFilters : null} />
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => renderRow(item)}
          ListHeaderComponent={recentSection}
          ItemSeparatorComponent={() => <View className="h-2" />}
          style={{ flexShrink: 1, minHeight: listMinHeight }}
          onContentSizeChange={(_width, contentHeight) => setListMinHeight(Math.min(LIST_MIN_HEIGHT, contentHeight))}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </>
  )
}
