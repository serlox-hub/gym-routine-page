import { useState, useMemo, useEffect } from 'react'
import { View, Text, Pressable, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react-native'
import { colors } from '../../lib/styles'
import { getMuscleGroupColor, getMuscleGroupName, getEquipmentName, getExerciseName, normalizeSearchText } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'
import { Card } from '../ui'
import ExerciseSearchBar from '../Exercise/ExerciseSearchBar'

export default function ExerciseSearchList({
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

  const renderItem = ({ item: exercise }) => {
    const isInRoutine = existingExerciseIds.has(exercise.id)
    return (
      <Pressable onPress={() => onSelect(exercise)} className="mx-0.5">
        <Card className="p-3" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Text className="font-medium text-sm" style={{ color: colors.textPrimary }} numberOfLines={1}>
                {getExerciseName(exercise)}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
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
              </View>
            </View>
            {isInRoutine && (
              <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)' }}>
                <Check size={12} color={colors.success} />
                <Text style={{ fontSize: 12, color: colors.success }}>{t('routine:exercise.inRoutine')}</Text>
              </View>
            )}
          </View>
        </Card>
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
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View className="h-2" />}
          style={{ maxHeight: 300 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </>
  )
}

function ExerciseBadge({ label, dot, accent }) {
  if (!label) return null
  return (
    <View
      className="flex-row items-center gap-1 px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: accent ? colors.accentBgSubtle : colors.bgTertiary }}
    >
      {dot && <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />}
      <Text style={{ fontSize: 10, color: accent ? colors.accent : colors.textSecondary }}>{label}</Text>
    </View>
  )
}
