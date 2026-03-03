import { useState, useEffect } from 'react'
import { useExercisesWithMuscleGroup, useMuscleGroups } from '../../hooks/useExercises.js'
import { Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { getNextSupersetId } from '../../lib/supersetUtils.js'
import { parseExerciseConfigForm } from '../../lib/routineExerciseForm.js'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm.jsx'
import ExerciseSearchList from './ExerciseSearchList.jsx'

function EditRoutineExerciseModal({ isOpen, onClose, onSubmit, isPending, routineExercise, existingSupersets = [], isReplacing = false }) {
  const [form, setForm] = useState({
    series: '3',
    reps: '',
    rir: '',
    rest_seconds: '',
    notes: '',
    tempo: '',
    tempo_razon: '',
    superset_group: '',
  })

  const { data: exercises, isLoading: loadingExercises } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()

  const exercise = routineExercise?.exercise

  // Populate form when routineExercise changes
  useEffect(() => {
    if (routineExercise) {
      setForm({
        series: String(routineExercise.series || 3),
        reps: routineExercise.reps || '',
        rir: routineExercise.rir !== null && routineExercise.rir !== undefined ? String(routineExercise.rir) : '',
        rest_seconds: routineExercise.rest_seconds ? String(routineExercise.rest_seconds) : '',
        notes: routineExercise.notes || '',
        tempo: routineExercise.tempo || '',
        tempo_razon: routineExercise.tempo_razon || '',
        superset_group: routineExercise.superset_group !== null && routineExercise.superset_group !== undefined
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      className="p-6 max-h-[85vh] flex flex-col"
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        {isReplacing ? 'Sustituir ejercicio' : 'Editar ejercicio'}
      </h3>

      {isReplacing ? (
        <>
          <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
            Sustituyendo: <strong style={{ color: colors.textPrimary }}>{exercise?.name}</strong>
          </p>
          <ExerciseSearchList
            exercises={exercises}
            muscleGroups={muscleGroups}
            isLoading={loadingExercises}
            onSelect={handleReplace}
          />
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ExerciseConfigForm
              exercise={exercise}
              form={form}
              setForm={setForm}
              showSupersetField={true}
              existingSupersets={existingSupersets}
              nextSupersetId={nextSuperset}
            />
          </div>
          <ExerciseConfigFormButtons
            onBack={onClose}
            onSubmit={handleSubmit}
            isPending={isPending}
            backLabel="Cancelar"
            submitLabel="Guardar"
            pendingLabel="Guardando..."
          />
        </>
      )}
    </Modal>
  )
}

export default EditRoutineExerciseModal
