import { useState, useEffect } from 'react'
import { Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui'
import { buildExerciseConfigForm, getNextSupersetId, parseExerciseConfigForm, validateExerciseConfigForm } from '@gym/shared'
import ExercisePickerModal from './ExercisePickerModal'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm'

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
  const { t } = useTranslation()
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [form, setForm] = useState(() => buildExerciseConfigForm())
  const [errors, setErrors] = useState({})

  const isSessionMode = mode === 'session'

  useEffect(() => {
    if (isOpen) {
      setSelectedExercise(null)
      setForm(buildExerciseConfigForm())
      setErrors({})
    }
  }, [isOpen])

  const handleSelectExercise = (exercise) => {
    setSelectedExercise(exercise)
    setForm(buildExerciseConfigForm(exercise.measurement_type))
    setErrors({})
  }

  const handleSubmit = () => {
    if (!selectedExercise) return
    const { valid, errors: formErrors } = validateExerciseConfigForm(form, selectedExercise.measurement_type)
    setErrors(formErrors)
    if (!valid) return
    onSubmit({
      exerciseId: selectedExercise.id,
      exercise: selectedExercise,
      ...parseExerciseConfigForm(form),
    })
  }

  const title = isWarmup ? t('routine:block.addToWarmup') : t('routine:block.addExercise')
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
        errors={errors}
      />
      <ExerciseConfigFormButtons
        onBack={() => setSelectedExercise(null)}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </Modal>
  )
}
