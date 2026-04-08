import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateExercise, useUpdateExercise, useExercise, useUserExerciseOverride, useUpsertUserExerciseOverride } from '../../hooks/useExercises.js'
import { getExerciseInstructions } from '@gym/shared'
import { Modal } from '../ui/index.js'
import { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm.jsx'
import ExerciseForm from './ExerciseForm.jsx'
import SystemExerciseDetailsPanel from './SystemExerciseDetailsPanel.jsx'
import { colors, inputStyle } from '../../lib/styles.js'

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
    <div className="p-4">
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 220px)' }}>
        <ExerciseForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
          compact
          minimal
          hideSubmitButton
        />
        <div className="mt-3">
          <h4 className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
            {t('exercise:personalNotes')}
          </h4>
          <textarea
            value={personalNotes}
            onChange={(e) => setPersonalNotes(e.target.value)}
            placeholder={t('exercise:personalNotesPlaceholder')}
            rows={2}
            className="w-full p-3 rounded-lg text-sm resize-none"
            style={inputStyle}
          />
        </div>
      </div>
      <ExerciseConfigFormButtons
        onBack={onClose}
        onSubmit={() => ExerciseForm._submit?.()}
        isPending={mutation.isPending}
        submitLabel={isEdit ? t('common:buttons.save') : t('common:buttons.add')}
      />
    </div>
  )
}

export default function ExerciseFormModal({ isOpen, onClose, exerciseId = null, initialName = '' }) {
  const { t } = useTranslation()
  const isEdit = !!exerciseId

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="center" maxWidth="max-w-md">
      <div className="p-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <p className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {isEdit ? t('exercise:edit') : t('exercise:new')}
        </p>
      </div>
      <ExerciseFormPanel exerciseId={exerciseId} initialName={initialName} onClose={onClose} />
    </Modal>
  )
}
