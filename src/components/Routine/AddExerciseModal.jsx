import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useExercisesWithMuscleGroup, useMuscleGroups, useCreateExercise } from '../../hooks/useExercises.js'
import { Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { getDefaultReps } from '../../lib/measurementTypes.js'
import { getNextSupersetId } from '../../lib/supersetUtils.js'
import ExerciseForm from '../Exercise/ExerciseForm.jsx'
import ExerciseSearchList from './ExerciseSearchList.jsx'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm.jsx'

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

/**
 * Modal unificado para añadir ejercicio a rutina o sesión
 */
function AddExerciseModal({ isOpen, onClose, onSubmit, isPending, isWarmup = false, mode = 'routine', existingSupersets = [] }) {
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)

  const isSessionMode = mode === 'session'

  const { data: exercises, isLoading } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const createExercise = useCreateExercise()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedExercise(null)
      setIsCreatingNew(false)
      setForm(DEFAULT_FORM)
    }
  }, [isOpen])

  const handleSelectExercise = (exercise) => {
    setSelectedExercise(exercise)
    setForm({
      ...DEFAULT_FORM,
      reps: getDefaultReps(exercise.measurement_type),
    })
  }

  const handleSubmit = () => {
    if (!selectedExercise) return

    const data = {
      exerciseId: selectedExercise.id,
      exercise: selectedExercise,
      series: parseInt(form.series) || 3,
      reps: form.reps || getDefaultReps(selectedExercise.measurement_type),
      notes: form.notes || null,
      tempo: form.tempo || null,
      tempo_razon: form.tempo_razon || null,
      rir: form.rir !== '' ? parseInt(form.rir) : null,
      rest_seconds: form.rest_seconds ? parseInt(form.rest_seconds) : null,
      superset_group: form.superset_group !== '' ? parseInt(form.superset_group) : null,
    }

    onSubmit(data)
  }

  const handleCreateExercise = async (exerciseData, muscleGroupId) => {
    const newExercise = await createExercise.mutateAsync({
      exercise: exerciseData,
      muscleGroupId,
    })

    setSelectedExercise({
      id: newExercise.id,
      name: newExercise.name,
      measurement_type: newExercise.measurement_type,
    })
    setForm({
      ...DEFAULT_FORM,
      reps: getDefaultReps(newExercise.measurement_type),
    })
    setIsCreatingNew(false)
  }

  const getTitle = () => {
    if (isCreatingNew) return 'Nuevo ejercicio'
    if (isWarmup) return 'Añadir calentamiento'
    return 'Añadir ejercicio'
  }

  const nextSuperset = getNextSupersetId(existingSupersets)

  // Mostrar superset si no es calentamiento (tanto en rutina como en sesión)
  const showSupersetField = !isWarmup

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      className="p-6 max-h-[85vh] flex flex-col"
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        {getTitle()}
      </h3>

      {isCreatingNew ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ExerciseForm
              onSubmit={handleCreateExercise}
              isSubmitting={createExercise.isPending}
              compact
              hideSubmitButton
            />
          </div>
          <div className="flex gap-2 pt-3 mt-3 border-t" style={{ borderColor: colors.border }}>
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="px-4 py-2.5 rounded-lg text-sm transition-colors"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector('form')
                if (form) form.requestSubmit()
              }}
              disabled={createExercise.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: colors.accent, color: '#ffffff' }}
            >
              <Plus size={16} />
              {createExercise.isPending ? 'Creando...' : 'Crear ejercicio'}
            </button>
          </div>
        </>
      ) : !selectedExercise ? (
        <>
          <ExerciseSearchList
            exercises={exercises}
            muscleGroups={muscleGroups}
            isLoading={isLoading}
            onSelect={handleSelectExercise}
          />
          <div className="flex gap-2 pt-3 mt-3 border-t" style={{ borderColor: colors.border }}>
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: colors.accent, color: '#ffffff' }}
            >
              <Plus size={16} />
              Crear nuevo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm transition-colors"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </Modal>
  )
}

export default AddExerciseModal
