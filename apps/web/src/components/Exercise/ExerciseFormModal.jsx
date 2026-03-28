import { useCreateExercise, useUpdateExercise, useExercise } from '../../hooks/useExercises.js'
import { Modal } from '../ui/index.js'
import { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm.jsx'
import ExerciseForm from './ExerciseForm.jsx'
import { colors } from '../../lib/styles.js'

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
      time_unit: exercise.time_unit,
      distance_unit: exercise.distance_unit,
      instructions: exercise.instructions,
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
      </div>
      <ExerciseConfigFormButtons
        onBack={onClose}
        onSubmit={() => ExerciseForm._submit?.()}
        isPending={mutation.isPending}
        backLabel="Cancelar"
        submitLabel="Guardar"
        pendingLabel="Guardando..."
      />
    </div>
  )
}

export default function ExerciseFormModal({ isOpen, onClose, exerciseId = null, initialName = '' }) {
  const isEdit = !!exerciseId

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="center" maxWidth="max-w-md">
      <div className="p-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <p className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {isEdit ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        </p>
      </div>
      <ExerciseFormPanel exerciseId={exerciseId} initialName={initialName} onClose={onClose} />
    </Modal>
  )
}
