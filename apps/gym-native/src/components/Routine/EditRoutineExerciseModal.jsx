import { useState, useEffect } from 'react'
import { Text } from 'react-native'
import { Modal } from '../ui'
import { getNextSupersetId, parseExerciseConfigForm } from '@gym/shared'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm'
import ExercisePickerModal from './ExercisePickerModal'

const DEFAULT_FORM = {
  series: '3',
  reps: '',
  rir: '',
  rest_seconds: '',
  notes: '',
  tempo: '',
  tempo_razon: '',
  superset_group: '',
}

export default function EditRoutineExerciseModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  routineExercise,
  existingSupersets = [],
  isReplacing = false,
}) {
  const [form, setForm] = useState(DEFAULT_FORM)

  const exercise = routineExercise?.exercise

  useEffect(() => {
    if (routineExercise) {
      setForm({
        series: String(routineExercise.series || 3),
        reps: routineExercise.reps || '',
        rir: routineExercise.rir != null ? String(routineExercise.rir) : '',
        rest_seconds: routineExercise.rest_seconds ? String(routineExercise.rest_seconds) : '',
        notes: routineExercise.notes || '',
        tempo: routineExercise.tempo || '',
        tempo_razon: routineExercise.tempo_razon || '',
        superset_group: routineExercise.superset_group != null
          ? String(routineExercise.superset_group)
          : '',
      })
    }
  }, [routineExercise])

  if (!routineExercise) return null

  const handleSubmit = () => {
    onSubmit({ exerciseId: routineExercise.id, ...parseExerciseConfigForm(form) })
  }

  const handleReplace = (newExercise) => {
    onSubmit({ exerciseId: routineExercise.id, exercise_id: newExercise.id, ...parseExerciseConfigForm(form) })
  }

  const nextSuperset = getNextSupersetId(existingSupersets)

  if (isReplacing) {
    return (
      <ExercisePickerModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleReplace}
        title="Sustituir ejercicio"
        subtitle={`Sustituyendo: ${exercise?.name}`}
        initialMuscleGroup={exercise?.muscle_group?.id}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-6" position="bottom">
      <Text className="text-primary text-lg font-semibold mb-4">Editar ejercicio</Text>

      <ExerciseConfigForm
        exercise={exercise}
        form={form}
        setForm={setForm}
        showSupersetField
        existingSupersets={existingSupersets}
        nextSupersetId={nextSuperset}
      />
      <ExerciseConfigFormButtons
        onBack={onClose}
        onSubmit={handleSubmit}
        isPending={isPending}
        backLabel="Cancelar"
        submitLabel="Guardar"
        pendingLabel="Guardando..."
      />
    </Modal>
  )
}
