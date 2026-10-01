import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, SaveStatus } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { buildExerciseConfigForm, getNextSupersetId, parseExerciseConfigForm, validateExerciseConfigForm, resolveTrackedFields } from '@gym/shared'
import ExercisePickerModal from './ExercisePickerModal.jsx'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm.jsx'

// `saveStatus`/`error`: a slow or failed add shown inline above the buttons. `onBackToPicker`: the
// picker step has no status line, so the caller stops treating the add as on screen.
function AddExerciseModal({ isOpen, onClose, onSubmit, isPending, isWarmup = false, mode = 'routine', existingSupersets = [], existingExercises = [], saveStatus = false, error = null, onBackToPicker }) {
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
    setForm(buildExerciseConfigForm(resolveTrackedFields(exercise)))
    setErrors({})
  }

  const handleBack = () => {
    setSelectedExercise(null)
    onBackToPicker?.()
  }

  const handleSubmit = () => {
    if (!selectedExercise) return
    const { valid, errors: formErrors } = validateExerciseConfigForm(form, resolveTrackedFields(selectedExercise))
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      className="p-6 max-h-[85vh] flex flex-col"
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        {title}
      </h3>

      {/* px-1 -mx-1: el ring de foco se corta si el padding horizontal vive en el padre. Ver CLAUDE.md · Styling */}
      <div className="flex-1 overflow-y-auto min-h-0 px-1 -mx-1">
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
      </div>
      {saveStatus && <SaveStatus isPending={isPending} error={error} className="my-3 flex-shrink-0" />}
      <ExerciseConfigFormButtons
        onBack={handleBack}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </Modal>
  )
}

export default AddExerciseModal
