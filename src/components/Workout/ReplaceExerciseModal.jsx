import { useState } from 'react'
import { useExercisesWithMuscleGroup, useMuscleGroups, useCreateExercise } from '../../hooks/useExercises.js'
import { Modal, Button } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import ExerciseForm from '../Exercise/ExerciseForm.jsx'
import ExerciseSearchList from '../Routine/ExerciseSearchList.jsx'

export default function ReplaceExerciseModal({
  isOpen,
  onClose,
  exerciseName,
  muscleGroupId,
  onSelect,
}) {
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { data: exercises, isLoading } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const createExercise = useCreateExercise()

  const handleClose = () => {
    setIsCreatingNew(false)
    setSearchTerm('')
    onClose()
  }

  const handleCreateExercise = async (exerciseData, muscleGroupId) => {
    const newExercise = await createExercise.mutateAsync({ exercise: exerciseData, muscleGroupId })
    onSelect(newExercise)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-md"
      className="p-6 max-h-[85vh] flex flex-col"
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        {isCreatingNew ? 'Nuevo ejercicio' : 'Sustituir ejercicio'}
      </h3>

      {isCreatingNew ? (
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
      ) : (
        <>
          <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
            Sustituyendo: <strong style={{ color: colors.textPrimary }}>{exerciseName}</strong>
          </p>
          <ExerciseSearchList
            exercises={exercises}
            muscleGroups={muscleGroups}
            isLoading={isLoading}
            onSelect={onSelect}
            initialMuscleGroup={muscleGroupId}
            search={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <div className="flex gap-2 pt-3 mt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
            <Button onClick={() => setIsCreatingNew(true)} className="flex-1">Crear nuevo</Button>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          </div>
        </>
      )}
    </Modal>
  )
}
