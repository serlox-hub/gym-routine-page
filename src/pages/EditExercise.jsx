import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import { LoadingSpinner } from '../components/ui/index.js'
import { useExercise, useUpdateExercise } from '../hooks/useExercises.js'
import { colors } from '../lib/styles.js'
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
      <header className="mb-6">
        <button
          onClick={() => navigate('/exercises')}
          className="flex items-center gap-1 text-sm mb-4 hover:opacity-80"
          style={{ color: colors.accent }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>
        <h1 className="text-2xl font-bold">Editar ejercicio</h1>
      </header>

      <ExerciseForm
        initialData={exercise}
        onSubmit={handleSubmit}
        isSubmitting={updateExercise.isPending}
        submitLabel="Guardar cambios"
        submitIcon={<Save size={20} />}
      />
    </div>
  )
}

export default EditExercise
