import { useNavigate } from 'react-router-dom'
import { useCreateExercise } from '../hooks/useExercises.js'
import { PageHeader } from '../components/ui/index.js'
import ExerciseForm from '../components/Exercise/ExerciseForm.jsx'

function NewExercise() {
  const navigate = useNavigate()
  const createExercise = useCreateExercise()

  const handleSubmit = async (exerciseData, muscleGroupId) => {
    await createExercise.mutateAsync({
      exercise: exerciseData,
      muscleGroupId,
    })
    navigate(-1)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <PageHeader title="Nuevo ejercicio" onBack={() => navigate(-1)} />

      <ExerciseForm
        onSubmit={handleSubmit}
        isSubmitting={createExercise.isPending}
        submitLabel="Crear"
      />
    </div>
  )
}

export default NewExercise
