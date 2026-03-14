import { useState, useEffect } from 'react'
import { useExercisesWithMuscleGroup, useMuscleGroups, useCreateExercise } from '../../hooks/useExercises.js'
import { Modal, Button } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { getNextSupersetId } from '../../lib/supersetUtils.js'
import { parseExerciseConfigForm } from '../../lib/routineExerciseForm.js'
import ExerciseForm from '../Exercise/ExerciseForm.jsx'
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
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const { data: exercises, isLoading: loadingExercises } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const createExercise = useCreateExercise()

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
      setIsCreatingNew(false)
      setSearchTerm('')
    }
  }, [routineExercise])

  if (!routineExercise) return null

  const handleSubmit = () => {
    onSubmit({ exerciseId: routineExercise.id, ...parseExerciseConfigForm(form) })
  }

  const handleReplace = (newExercise) => {
    onSubmit({ exerciseId: routineExercise.id, exercise_id: newExercise.id, ...parseExerciseConfigForm(form) })
  }

  const handleCreateExercise = async (exerciseData, muscleGroupId) => {
    const newExercise = await createExercise.mutateAsync({ exercise: exerciseData, muscleGroupId })
    handleReplace(newExercise)
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
        {isCreatingNew ? 'Nuevo ejercicio' : isReplacing ? 'Sustituir ejercicio' : 'Editar ejercicio'}
      </h3>

      {isReplacing && isCreatingNew ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ExerciseForm
              onSubmit={handleCreateExercise}
              isSubmitting={createExercise.isPending}
              initialData={searchTerm.trim() ? { name: searchTerm.trim() } : null}
              compact
            />
          </div>
          <div className="flex gap-2 pt-3 mt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
            <Button variant="secondary" onClick={() => setIsCreatingNew(false)}>Cancelar</Button>
          </div>
        </>
      ) : isReplacing ? (
        <>
          <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
            Sustituyendo: <strong style={{ color: colors.textPrimary }}>{exercise?.name}</strong>
          </p>
          <ExerciseSearchList
            exercises={exercises}
            muscleGroups={muscleGroups}
            isLoading={loadingExercises}
            onSelect={handleReplace}
            initialMuscleGroup={exercise?.muscle_group?.id}
            search={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <div className="flex gap-2 pt-3 mt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
            <Button onClick={() => setIsCreatingNew(true)} className="flex-1">Crear nuevo</Button>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          </div>
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
