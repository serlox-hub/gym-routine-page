import { useState, useEffect } from 'react'
import { View, Text, TextInput, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useCreateExercise, useUpdateExercise, useExercise, useUserExerciseOverride, useUpsertUserExerciseOverride } from '../../hooks/useExercises'
import { getExerciseInstructions } from '@gym/shared'
import { Modal } from '../ui'
import { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm'
import ExerciseForm from './ExerciseForm'
import SystemExerciseDetailsPanel from './SystemExerciseDetailsPanel'
import { colors, inputStyle } from '../../lib/styles'

export function ExerciseFormPanel({ exerciseId = null, initialName = '', onClose, onSaveSuccess }) {
  const { t } = useTranslation()
  const isEdit = !!exerciseId
  const { data: exercise } = useExercise(exerciseId)
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()

  const { data: override } = useUserExerciseOverride(isEdit ? exerciseId : null)
  const upsertOverride = useUpsertUserExerciseOverride()
  const [personalNotes, setPersonalNotes] = useState('')

  useEffect(() => {
    if (override) setPersonalNotes(override.notes || '')
  }, [override])

  const mutation = isEdit ? updateExercise : createExercise

  // System exercises show info banner + personal notes panel
  if (isEdit && exercise?.is_system) {
    return (
      <SystemExerciseDetailsPanel
        exerciseId={exerciseId}
        onClose={onClose}
      />
    )
  }

  const handleSubmit = async (formData, muscleGroupId) => {
    try {
      if (isEdit) {
        await updateExercise.mutateAsync({ exerciseId, exercise: formData, muscleGroupId })
        if (personalNotes !== (override?.notes || '')) {
          await upsertOverride.mutateAsync({ exerciseId, notes: personalNotes })
        }
      } else {
        const newExercise = await createExercise.mutateAsync({ exercise: formData, muscleGroupId })
        if (personalNotes.trim()) {
          await upsertOverride.mutateAsync({ exerciseId: newExercise.id, notes: personalNotes })
        }
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
        <View className="mt-3">
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
            {t('exercise:personalNotes')}
          </Text>
          <TextInput
            value={personalNotes}
            onChangeText={setPersonalNotes}
            placeholder={t('exercise:personalNotesPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
            style={[inputStyle, { minHeight: 60, textAlignVertical: 'top', fontSize: 14 }]}
          />
        </View>
      </ScrollView>
      <ExerciseConfigFormButtons
        onBack={onClose}
        onSubmit={() => ExerciseForm._submit?.()}
        isPending={mutation.isPending}
        submitLabel={isEdit ? t('common:buttons.save') : t('common:buttons.add')}
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
