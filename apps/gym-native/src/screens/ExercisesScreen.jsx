import { useState, useMemo } from 'react'
import { View, Text, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, TrendingUp, BarChart3 } from 'lucide-react-native'
import { useExercisesWithMuscleGroup, useDeleteExercise, useMuscleGroups, useEquipmentTypes, useExerciseStats } from '../hooks/useExercises'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, PageHeader, DropdownMenu, Button, ActiveSessionBanner } from '../components/ui'
import { ExerciseSearchBar, ExerciseUsageModal, ExerciseFormModal } from '../components/Exercise'
import { normalizeSearchText, getMuscleGroupColor, getMuscleGroupName, getEquipmentName, getExerciseName } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../lib/muscleGroupStyles'
import { colors } from '../lib/styles'

export default function ExercisesScreen({ navigation }) {
  const { t } = useTranslation()
  const { data: exercises, isLoading, error, refetch, isRefetching } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const { data: equipmentTypes } = useEquipmentTypes()
  const { data: exerciseStats } = useExerciseStats()
  const deleteExercise = useDeleteExercise()

  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [selectedEquipmentType, setSelectedEquipmentType] = useState(null)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showUsage, setShowUsage] = useState(false)
  const [exerciseToDelete, setExerciseToDelete] = useState(null)
  const [exerciseForUsage, setExerciseForUsage] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editExerciseId, setEditExerciseId] = useState(null)

  const filteredExercises = useMemo(() => {
    if (!exercises) return []
    return exercises.filter(e => {
      const matchesSearch = !search.trim() || normalizeSearchText(getExerciseName(e)).includes(normalizeSearchText(search))
      const matchesMuscleGroup = !selectedMuscleGroup || e.muscle_group_id === selectedMuscleGroup
      const matchesEquipment = !selectedEquipmentType || e.equipment_type?.id === selectedEquipmentType
      const matchesSource = sourceFilter === 'all' || (sourceFilter === 'custom' ? !e.is_system : e.is_system)
      return matchesSearch && matchesMuscleGroup && matchesEquipment && matchesSource
    })
  }, [exercises, search, selectedMuscleGroup, selectedEquipmentType, sourceFilter])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDelete = () => {
    if (!exerciseToDelete) return
    deleteExercise.mutate(exerciseToDelete.id, {
      onSuccess: () => setExerciseToDelete(null),
    })
  }

  const handleCreate = () => setShowCreateModal(true)

  const getUsageText = (exerciseId) => {
    const parts = []
    const routineCount = exerciseStats?.routineCounts?.[exerciseId]
    const sessionCount = exerciseStats?.sessionCounts?.[exerciseId]
    if (routineCount) parts.push(t('exercise:usage.inRoutines', { count: routineCount }))
    if (sessionCount) parts.push(t('exercise:usage.inSessions', { count: sessionCount }))
    if (parts.length === 0) parts.push(t('exercise:usage.noUsage'))
    return parts.join(' · ')
  }

  const renderItem = ({ item: exercise }) => (
    <Card className="p-3 mx-4" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-primary font-medium text-sm" numberOfLines={1}>{getExerciseName(exercise)}</Text>
          <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
            <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: colors.bgTertiary }}>
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getMuscleGroupColor(exercise.muscle_group?.name) }} />
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{getMuscleGroupName(exercise.muscle_group)}</Text>
            </View>
            {exercise.equipment_type && (
              <View className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: colors.bgTertiary }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{getEquipmentName(exercise.equipment_type)}</Text>
              </View>
            )}
            {!exercise.is_system && (
              <View className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: colors.accentBgSubtle }}>
                <Text style={{ fontSize: 10, color: colors.accent }}>{t('exercise:custom')}</Text>
              </View>
            )}
          </View>
          {showUsage && (
            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{getUsageText(exercise.id)}</Text>
          )}
        </View>
        <DropdownMenu
          items={[
            { icon: BarChart3, label: t('exercise:usage.title'), onPress: () => setExerciseForUsage(exercise) },
            { icon: TrendingUp, label: t('exercise:progression'), onPress: () => navigation.navigate('ExerciseProgress', { exerciseId: exercise.id, exerciseName: getExerciseName(exercise) }) },
            !exercise.is_system && { icon: Pencil, label: t('common:buttons.edit'), onPress: () => setEditExerciseId(exercise.id) },
            !exercise.is_system && { icon: Trash2, label: t('common:buttons.delete'), onPress: () => setExerciseToDelete(exercise), danger: true },
          ].filter(Boolean)}
        />
      </View>
    </Card>
  )

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title={t('exercise:title')} onBack={() => navigation.goBack()} />

      <View className="px-4">
        <ExerciseSearchBar
          search={search}
          onSearchChange={setSearch}
          muscleGroups={muscleGroups}
          selectedMuscleGroup={selectedMuscleGroup}
          onMuscleGroupChange={setSelectedMuscleGroup}
          equipmentTypes={equipmentTypes}
          selectedEquipmentType={selectedEquipmentType}
          onEquipmentTypeChange={setSelectedEquipmentType}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          showUsage={showUsage}
          onToggleUsage={setShowUsage}
        />
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View className="h-2" />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text className="text-secondary text-center py-8">
            {search ? t('exercise:noExercisesSearch') : t('exercise:noExercises')}
          </Text>
        }
        keyboardShouldPersistTaps="handled"
        refreshing={isRefetching}
        onRefresh={refetch}
      />

      <View className="px-4 py-3" style={{ backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button onPress={handleCreate}>{t('common:buttons.create')}</Button>
      </View>

      <ConfirmModal
        isOpen={!!exerciseToDelete}
        title={t('exercise:delete')}
        message={t('exercise:deleteConfirm', { name: exerciseToDelete?.name })}
        confirmText={t('common:buttons.delete')}
        onConfirm={handleDelete}
        onCancel={() => setExerciseToDelete(null)}
      />

      <ExerciseUsageModal
        exercise={exerciseForUsage}
        onClose={() => setExerciseForUsage(null)}
      />

      <ExerciseFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialName={search.trim()}
      />

      <ExerciseFormModal
        isOpen={!!editExerciseId}
        onClose={() => setEditExerciseId(null)}
        exerciseId={editExerciseId}
      />

      <ActiveSessionBanner />
    </SafeAreaView>
  )
}
