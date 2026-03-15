import { useState, useEffect } from 'react'
import { Text } from 'react-native'
import { Modal } from '../ui'
import { getDefaultReps } from '../../lib/measurementTypes'
import { getNextSupersetId } from '../../lib/supersetUtils'
import { parseExerciseConfigForm } from '../../lib/routineExerciseForm'
import ExercisePickerModal from './ExercisePickerModal'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm'

const DEFAULT_FORM = {
  series: '3',
  reps: '',
  notes: '',
  tempo: '',
  tempo_razon: '',
  rir: '',
  rest_seconds: '',
  superset_group: '',
}

export default function AddExerciseModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  isWarmup = false,
  mode = 'routine',
  existingSupersets = [],
  existingExercises = [],
}) {
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)

  const isSessionMode = mode === 'session'

  useEffect(() => {
    if (isOpen) {
      setSelectedExercise(null)
      setForm(DEFAULT_FORM)
    }
  }, [isOpen])

  const handleSelectExercise = (exercise) => {
    setSelectedExercise(exercise)
    setForm({ ...DEFAULT_FORM, reps: getDefaultReps(exercise.measurement_type) })
  }

  const handleSubmit = () => {
    if (!selectedExercise) return
    const defaultReps = getDefaultReps(selectedExercise.measurement_type)
    onSubmit({
      exerciseId: selectedExercise.id,
      exercise: selectedExercise,
      ...parseExerciseConfigForm(form, { defaultReps }),
    })
  }

  const title = isWarmup ? 'Añadir calentamiento' : 'Añadir ejercicio'
  const nextSuperset = getNextSupersetId(existingSupersets)
  const showSupersetField = !isWarmup

  if (!selectedExercise) {
    return (
      <ExercisePickerModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleSelectExercise}
        title={title}
        existingExerciseIds={new Set(existingExercises.map(e => e.exercise_id))}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-6" position="bottom">
      <Text className="text-primary text-lg font-semibold mb-4">{title}</Text>

      <ExerciseConfigForm
        exercise={selectedExercise}
        form={form}
        setForm={setForm}
        isSessionMode={isSessionMode}
        showSupersetField={showSupersetField}
        existingSupersets={existingSupersets}
        nextSupersetId={nextSuperset}
      />
      <ExerciseConfigFormButtons
        onBack={() => setSelectedExercise(null)}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </Modal>
  )
}
