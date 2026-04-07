import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useExercisesWithMuscleGroup, useMuscleGroups, useEquipmentTypes, useCreateExercise } from '../../hooks/useExercises'
import { Modal, Button } from '../ui'
import ExerciseForm from '../Exercise/ExerciseForm'
import ExerciseSearchList from './ExerciseSearchList'

export default function ExercisePickerModal({
  isOpen,
  onClose,
  onSelect,
  title,
  subtitle,
  initialMuscleGroup,
  existingExerciseIds,
}) {
  const { t } = useTranslation()
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { data: exercises, isLoading } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const { data: equipmentTypes } = useEquipmentTypes()
  const createExercise = useCreateExercise()

  useEffect(() => {
    if (isOpen) {
      setIsCreatingNew(false)
      setSearchTerm('')
    }
  }, [isOpen])

  const handleCreateExercise = async (exerciseData, muscleGroupId) => {
    const newExercise = await createExercise.mutateAsync({ exercise: exerciseData, muscleGroupId })
    onSelect(newExercise)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-6" position="bottom">
      <Text className="text-primary text-lg font-semibold mb-4">
        {isCreatingNew ? t('exercise:new') : (title || t('exercise:selectExercise'))}
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
            <Button variant="secondary" onPress={() => setIsCreatingNew(false)}>{t('common:buttons.cancel')}</Button>
            <Button
              onPress={() => ExerciseForm._submit?.()}
              loading={createExercise.isPending}
              className="flex-1"
            >
              {t('exercise:create')}
            </Button>
          </View>
        </>
      ) : (
        <>
          {subtitle && (
            <Text className="text-secondary text-sm mb-3">{subtitle}</Text>
          )}
          <ExerciseSearchList
            exercises={exercises}
            muscleGroups={muscleGroups}
            equipmentTypes={equipmentTypes}
            isLoading={isLoading}
            onSelect={onSelect}
            initialMuscleGroup={initialMuscleGroup}
            existingExerciseIds={existingExerciseIds}
            search={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <View className="flex-row gap-2 pt-3 mt-3 border-t border-border">
            <Button onPress={() => setIsCreatingNew(true)} className="flex-1">{t('exercise:new')}</Button>
            <Button variant="secondary" onPress={onClose}>{t('common:buttons.cancel')}</Button>
          </View>
        </>
      )}
    </Modal>
  )
}
