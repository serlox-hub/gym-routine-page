import { useParams, useNavigate } from 'react-router-dom'
import { LoadingSpinner, PageHeader } from '../components/ui/index.js'
import { useExercise, useUpdateExercise } from '../hooks/useExercises.js'
import ExerciseForm from '../components/Exercise/ExerciseForm.jsx'

function EditExercise() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()

  const { data: exercise, isLoading } = useExercise(exerciseId)
  const updateExercise = useUpdateExercise()

  if (isLoading) return <LoadingSpinner />

  const handleSubmit = async (exerciseData, muscleGroupId) => {
    await updateExercise.mutateAsync({
      exerciseId: parseInt(exerciseId),
      exercise: exerciseData,
      muscleGroupId,
    })
    navigate('/exercises')
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <PageHeader title="Editar ejercicio" backTo="/exercises" />

      <ExerciseForm
        initialData={exercise}
        onSubmit={handleSubmit}
        isSubmitting={updateExercise.isPending}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}

export default EditExercise
