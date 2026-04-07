import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useExercisesWithMuscleGroup, useMuscleGroups, useEquipmentTypes, useCreateExercise } from '../../hooks/useExercises.js'
import { Modal, Button } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import ExerciseForm from '../Exercise/ExerciseForm.jsx'
import ExerciseSearchList from './ExerciseSearchList.jsx'

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
  const _title = title || t('exercise:selectExercise')
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      className="p-6 max-h-[85vh] flex flex-col"
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        {isCreatingNew ? t('exercise:new') : _title}
      </h3>

      {isCreatingNew ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ExerciseForm
              id="create-exercise-form"
              onSubmit={handleCreateExercise}
              isSubmitting={createExercise.isPending}
              initialData={searchTerm.trim() ? { name: searchTerm.trim() } : null}
              compact
              hideSubmitButton
            />
          </div>
          <div className="flex gap-2 pt-3 mt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
            <Button
              type="submit"
              form="create-exercise-form"
              disabled={createExercise.isPending}
              className="flex-1"
            >
              {createExercise.isPending ? t('common:buttons.loading') : t('common:buttons.save')}
            </Button>
            <Button variant="secondary" onClick={() => setIsCreatingNew(false)}>{t('common:buttons.cancel')}</Button>
          </div>
        </>
      ) : (
        <>
          {subtitle && (
            <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>{subtitle}</p>
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
          <div className="flex gap-2 pt-3 mt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
            <Button onClick={() => setIsCreatingNew(true)} className="flex-1">{t('exercise:create')}</Button>
            <Button variant="secondary" onClick={onClose}>{t('common:buttons.cancel')}</Button>
          </div>
        </>
      )}
    </Modal>
  )
}
