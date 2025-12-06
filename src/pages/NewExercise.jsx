import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus } from 'lucide-react'
import { useCreateExercise } from '../hooks/useExercises.js'
import { colors } from '../lib/styles.js'
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
      <header className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm mb-4 hover:opacity-80"
          style={{ color: colors.accent }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>
        <h1 className="text-2xl font-bold">Nuevo ejercicio</h1>
      </header>

      <ExerciseForm
        onSubmit={handleSubmit}
        isSubmitting={createExercise.isPending}
        submitLabel="Crear ejercicio"
        submitIcon={<Plus size={20} />}
      />
    </div>
  )
}

export default NewExercise
