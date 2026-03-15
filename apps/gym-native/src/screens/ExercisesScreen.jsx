import { useState, useMemo } from 'react'
import { View, Text, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Pencil, Trash2, TrendingUp, BarChart3 } from 'lucide-react-native'
import { useExercisesWithMuscleGroup, useDeleteExercise, useMuscleGroups, useExerciseStats } from '../hooks/useExercises'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, PageHeader, DropdownMenu, Button, ActiveSessionBanner } from '../components/ui'
import { ExerciseSearchBar, ExerciseUsageModal } from '../components/Exercise'
import { normalizeSearchText } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../lib/muscleGroupStyles'
import { colors } from '../lib/styles'

export default function ExercisesScreen({ navigation }) {
  const { data: exercises, isLoading, error, refetch, isRefetching } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const { data: exerciseStats } = useExerciseStats()
  const deleteExercise = useDeleteExercise()

  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [exerciseToDelete, setExerciseToDelete] = useState(null)
  const [exerciseForUsage, setExerciseForUsage] = useState(null)

  const filteredExercises = useMemo(() => {
    if (!exercises) return []
    return exercises.filter(e => {
      const matchesSearch = !search.trim() || normalizeSearchText(e.name).includes(normalizeSearchText(search))
      const matchesMuscleGroup = !selectedMuscleGroup || e.muscle_group_id === selectedMuscleGroup
      return matchesSearch && matchesMuscleGroup
    })
  }, [exercises, search, selectedMuscleGroup])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDelete = () => {
    if (!exerciseToDelete) return
    deleteExercise.mutate(exerciseToDelete.id, {
      onSuccess: () => setExerciseToDelete(null),
    })
  }

  const handleCreate = () => {
    navigation.navigate('NewExercise', search.trim() ? { name: search.trim() } : {})
  }

  const getUsageText = (exerciseId) => {
    const parts = []
    const routineCount = exerciseStats?.routineCounts?.[exerciseId]
    const sessionCount = exerciseStats?.sessionCounts?.[exerciseId]
    if (routineCount) parts.push(`En ${routineCount} ${routineCount === 1 ? 'rutina' : 'rutinas'}`)
    if (sessionCount) parts.push(`Usado ${sessionCount} ${sessionCount === 1 ? 'vez' : 'veces'}`)
    if (parts.length === 0) parts.push('Sin uso')
    return parts.join(' · ')
  }

  const renderItem = ({ item: exercise }) => (
    <Card className="p-3 mx-4" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-primary font-medium text-sm" numberOfLines={1}>{exercise.name}</Text>
          <Text className="text-secondary text-xs">{getUsageText(exercise.id)}</Text>
        </View>
        <DropdownMenu
          items={[
            { icon: BarChart3, label: 'Ver usos', onPress: () => setExerciseForUsage(exercise) },
            { icon: TrendingUp, label: 'Progresión', onPress: () => navigation.navigate('ExerciseProgress', { exerciseId: exercise.id, exerciseName: exercise.name }) },
            { icon: Pencil, label: 'Editar', onPress: () => navigation.navigate('EditExercise', { exerciseId: exercise.id }) },
            { icon: Trash2, label: 'Eliminar', onPress: () => setExerciseToDelete(exercise), danger: true },
          ]}
        />
      </View>
    </Card>
  )

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title="Ejercicios" onBack={() => navigation.goBack()} />

      <View className="px-4">
        <ExerciseSearchBar
          search={search}
          onSearchChange={setSearch}
          muscleGroups={muscleGroups}
          selectedMuscleGroup={selectedMuscleGroup}
          onMuscleGroupChange={setSelectedMuscleGroup}
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
            {search ? 'No se encontraron ejercicios' : 'No hay ejercicios'}
          </Text>
        }
        keyboardShouldPersistTaps="handled"
        refreshing={isRefetching}
        onRefresh={refetch}
      />

      <View className="px-4 py-3" style={{ backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button onPress={handleCreate}>Nuevo</Button>
      </View>

      <ConfirmModal
        isOpen={!!exerciseToDelete}
        title="Eliminar ejercicio"
        message={`¿Seguro que quieres eliminar "${exerciseToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setExerciseToDelete(null)}
      />

      <ExerciseUsageModal
        exercise={exerciseForUsage}
        onClose={() => setExerciseForUsage(null)}
      />

      <ActiveSessionBanner />
    </SafeAreaView>
  )
}
