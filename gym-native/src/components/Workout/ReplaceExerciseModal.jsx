import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useExercisesWithMuscleGroup, useMuscleGroups, useCreateExercise } from '../../hooks/useExercises'
import { Modal, Button } from '../ui'
import ExerciseForm from '../Exercise/ExerciseForm'
import { ExerciseSearchList } from '../Routine'

export default function ReplaceExerciseModal({
  isOpen,
  onClose,
  exerciseName,
  muscleGroupId,
  onSelect,
}) {
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { data: exercises, isLoading } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const createExercise = useCreateExercise()

  const handleClose = () => {
    setIsCreatingNew(false)
    setSearchTerm('')
    onClose()
  }

  const handleCreateExercise = async (exerciseData, muscleGroupId) => {
    const newExercise = await createExercise.mutateAsync({ exercise: exerciseData, muscleGroupId })
    onSelect(newExercise)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-6" position="bottom">
      <Text className="text-primary text-lg font-semibold mb-4">
        {isCreatingNew ? 'Nuevo ejercicio' : 'Sustituir ejercicio'}
      </Text>

      {isCreatingNew ? (
        <>
          <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
            <ExerciseForm
              onSubmit={handleCreateExercise}
              isSubmitting={createExercise.isPending}
              initialData={searchTerm.trim() ? { name: searchTerm.trim() } : null}
              compact
              hideSubmitButton
            />
          </ScrollView>
          <View className="flex-row gap-2 pt-3 mt-3 border-t border-border">
            <Button variant="secondary" onPress={() => setIsCreatingNew(false)}>Cancelar</Button>
            <Button
              onPress={() => ExerciseForm._submit?.()}
              loading={createExercise.isPending}
              className="flex-1"
            >
              Crear ejercicio
            </Button>
          </View>
        </>
      ) : (
        <>
          <Text className="text-secondary text-sm mb-3">
            Sustituyendo: <Text className="text-primary font-semibold">{exerciseName}</Text>
          </Text>
          <ExerciseSearchList
            exercises={exercises}
            muscleGroups={muscleGroups}
            isLoading={isLoading}
            onSelect={onSelect}
            initialMuscleGroup={muscleGroupId}
            search={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <View className="flex-row gap-2 pt-3 mt-3 border-t border-border">
            <Button onPress={() => setIsCreatingNew(true)} className="flex-1">Crear nuevo</Button>
            <Button variant="secondary" onPress={handleClose}>Cancelar</Button>
          </View>
        </>
      )}
    </Modal>
  )
}
