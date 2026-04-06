import { View, Text, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useCreateExercise, useUpdateExercise, useExercise } from '../../hooks/useExercises'
import { getExerciseInstructions } from '@gym/shared'
import { Modal } from '../ui'
import { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm'
import ExerciseForm from './ExerciseForm'
import { colors } from '../../lib/styles'

export function ExerciseFormPanel({ exerciseId = null, initialName = '', onClose, onSaveSuccess }) {
  const isEdit = !!exerciseId
  const { data: exercise } = useExercise(exerciseId)
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()

  const mutation = isEdit ? updateExercise : createExercise

  const handleSubmit = async (formData, muscleGroupId) => {
    try {
      if (isEdit) {
        await updateExercise.mutateAsync({ exerciseId, exercise: formData, muscleGroupId })
      } else {
        await createExercise.mutateAsync({ exercise: formData, muscleGroupId })
      }
      onSaveSuccess?.()
      onClose()
    } catch { /* handled by TanStack Query */ }
  }

  const initialData = isEdit && exercise
    ? {
      name: exercise.name,
      measurement_type: exercise.measurement_type,
      weight_unit: exercise.weight_unit,
      instructions: getExerciseInstructions(exercise),
      muscle_group_id: exercise.muscle_group_id,
    }
    : initialName ? { name: initialName } : null

  return (
    <>
      <ScrollView className="p-4" keyboardShouldPersistTaps="handled">
        <ExerciseForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
          minimal
          hideSubmitButton
        />
      </ScrollView>
      <ExerciseConfigFormButtons
        onBack={onClose}
        onSubmit={() => ExerciseForm._submit?.()}
        isPending={mutation.isPending}
        backLabel={undefined}
        submitLabel={undefined}
        pendingLabel={undefined}
      />
    </>
  )
}

export default function ExerciseFormModal({ isOpen, onClose, exerciseId = null, initialName = '' }) {
  const { t } = useTranslation()
  const isEdit = !!exerciseId

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {isEdit ? t('exercise:edit') : t('exercise:new')}
        </Text>
      </View>
      <ExerciseFormPanel exerciseId={exerciseId} initialName={initialName} onClose={onClose} />
    </Modal>
  )
}
