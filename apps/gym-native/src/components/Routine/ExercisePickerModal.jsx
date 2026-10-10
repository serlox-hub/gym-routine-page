import { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { getRecentExercises } from '@gym/shared'
import { useExercisesWithMuscleGroup, useMuscleGroups, useEquipmentTypes, useCreateExercise, useRecentExerciseStats } from '../../hooks/useExercises'
import { Modal, Button } from '../ui'
import ExerciseForm from '../Exercise/ExerciseForm'
import ExerciseSearchList from './ExerciseSearchList'
import { colors } from '../../lib/styles'

export default function ExercisePickerModal({
  isOpen,
  onClose,
  onSelect,
  title,
  subtitle,
  initialMuscleGroup,
  existingExerciseIds,
  isExerciseAllowed,
  newExerciseDefaults,
  notAllowedMessage,
}) {
  const { t } = useTranslation()
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notAllowedError, setNotAllowedError] = useState(false)
  const { data: allExercises, isLoading } = useExercisesWithMuscleGroup()
  // Filtered before "Recent" and the search are computed, so neither offers an excluded exercise.
  const exercises = useMemo(
    () => (isExerciseAllowed && allExercises ? allExercises.filter(isExerciseAllowed) : allExercises),
    [allExercises, isExerciseAllowed],
  )
  const { data: muscleGroups } = useMuscleGroups()
  const { data: equipmentTypes } = useEquipmentTypes()
  const { data: recentStats } = useRecentExerciseStats({ enabled: isOpen })
  const recentExercises = useMemo(() => getRecentExercises(recentStats, exercises), [recentStats, exercises])
  const createExercise = useCreateExercise()

  useEffect(() => {
    if (isOpen) {
      setIsCreatingNew(false)
      setSearchTerm('')
      setNotAllowedError(false)
    }
  }, [isOpen])

  const handleCreateExercise = async (exerciseData, muscleGroupId) => {
    // Checked before creating, so a rejected exercise never lands in the user's catalog.
    if (isExerciseAllowed && !isExerciseAllowed(exerciseData)) {
      setNotAllowedError(true)
      return
    }
    setNotAllowedError(false)
    const newExercise = await createExercise.mutateAsync({ exercise: exerciseData, muscleGroupId })
    onSelect(newExercise)
  }

  const trimmedSearch = searchTerm.trim()
  const initialFormData = useMemo(
    () => (trimmedSearch || newExerciseDefaults)
      ? { ...newExerciseDefaults, ...(trimmedSearch && { name: trimmedSearch }) }
      : null,
    [trimmedSearch, newExerciseDefaults],
  )

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
              initialData={initialFormData}
              compact
              hideSubmitButton
            />
          </ScrollView>
          {notAllowedError && notAllowedMessage && (
            <Text className="text-sm mt-3" style={{ color: colors.danger }}>{notAllowedMessage}</Text>
          )}
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
            recentExercises={recentExercises}
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
