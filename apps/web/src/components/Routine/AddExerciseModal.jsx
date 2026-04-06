import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { getDefaultReps, getNextSupersetId, parseExerciseConfigForm } from '@gym/shared'
import ExercisePickerModal from './ExercisePickerModal.jsx'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm.jsx'

const DEFAULT_FORM = {
  series: '3',
  reps: '',
  notes: '',
  rir: '',
  rest_seconds: '',
  superset_group: '',
}

function AddExerciseModal({ isOpen, onClose, onSubmit, isPending, isWarmup = false, mode = 'routine', existingSupersets = [], existingExercises = [] }) {
  const { t } = useTranslation()
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      className="p-6 max-h-[85vh] flex flex-col"
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        {title}
      </h3>

      <div className="flex-1 overflow-y-auto min-h-0">
        <ExerciseConfigForm
          exercise={selectedExercise}
          form={form}
          setForm={setForm}
          isSessionMode={isSessionMode}
          showSupersetField={showSupersetField}
          existingSupersets={existingSupersets}
          nextSupersetId={nextSuperset}
        />
      </div>
      <ExerciseConfigFormButtons
        onBack={() => setSelectedExercise(null)}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </Modal>
  )
}

export default AddExerciseModal
