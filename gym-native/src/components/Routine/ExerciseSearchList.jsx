import { useState, useMemo, useEffect } from 'react'
import { View, Text, Pressable, FlatList } from 'react-native'
import { Check } from 'lucide-react-native'
import { colors } from '../../lib/styles'
import { normalizeSearchText } from '../../lib/textUtils'
import { getMuscleGroupColor } from '../../lib/constants'
import ExerciseSearchBar from '../Exercise/ExerciseSearchBar'

export default function ExerciseSearchList({
  exercises,
  muscleGroups,
  isLoading,
  onSelect,
  existingExerciseIds = new Set(),
  search = '',
  onSearchChange,
  initialMuscleGroup = null,
}) {
  const [internalSearch, setInternalSearch] = useState(search)
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(initialMuscleGroup)

  useEffect(() => {
    setSelectedMuscleGroup(initialMuscleGroup)
  }, [initialMuscleGroup])

  const currentSearch = onSearchChange ? search : internalSearch
  const handleSearchChange = onSearchChange || setInternalSearch

  const filteredExercises = useMemo(() => {
    if (!exercises) return []
    return exercises.filter(ex => {
      const matchesSearch = normalizeSearchText(ex.name).includes(normalizeSearchText(currentSearch))
      if (!selectedMuscleGroup) return matchesSearch
      return matchesSearch && ex.muscle_group_id === selectedMuscleGroup
    })
  }, [exercises, currentSearch, selectedMuscleGroup])

  const renderItem = ({ item: exercise }) => {
    const isInRoutine = existingExerciseIds.has(exercise.id)
    return (
      <Pressable
        onPress={() => onSelect(exercise)}
        className="p-3 rounded-lg flex-row items-center justify-between gap-2"
      >
        <View className="flex-row items-center gap-2 flex-1">
          <View
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: getMuscleGroupColor(exercise.muscle_group?.name) }}
          />
          <Text className="text-primary font-medium" numberOfLines={1}>{exercise.name}</Text>
        </View>
        {isInRoutine && (
          <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)' }}>
            <Check size={12} color={colors.success} />
            <Text className="text-xs" style={{ color: colors.success }}>En rutina</Text>
          </View>
        )}
      </Pressable>
    )
  }

  return (
    <>
      <ExerciseSearchBar
        search={currentSearch}
        onSearchChange={handleSearchChange}
        muscleGroups={muscleGroups}
        selectedMuscleGroup={selectedMuscleGroup}
        onMuscleGroupChange={setSelectedMuscleGroup}
        autoFocus
      />
      {isLoading ? (
        <Text className="text-secondary text-center py-4">Cargando...</Text>
      ) : filteredExercises.length === 0 ? (
        <Text className="text-secondary text-center py-4">No se encontraron ejercicios</Text>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          style={{ maxHeight: 300 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </>
  )
}
