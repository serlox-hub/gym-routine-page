import { useParams, useNavigate } from 'react-router-dom'
import { useRoutine, useRoutineDays } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage } from '../components/ui/index.js'
import { DayCard } from '../components/Routine/index.js'

function RoutineDetail() {
  const { routineId } = useParams()
  const navigate = useNavigate()

  const { data: routine, isLoading: loadingRoutine, error: routineError } = useRoutine(routineId)
  const { data: days, isLoading: loadingDays, error: daysError } = useRoutineDays(routineId)

  const isLoading = loadingRoutine || loadingDays
  const error = routineError || daysError

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-secondary hover:text-accent mb-2 transition-colors"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold">{routine.nombre}</h1>
      </header>

      <main className="space-y-3">
        <h2 className="text-lg font-semibold">Días de entrenamiento</h2>
        {days?.length === 0 ? (
          <p className="text-secondary">No hay días configurados</p>
        ) : (
          <div className="space-y-2">
            {days?.map(day => (
              <DayCard key={day.id} day={day} routineId={routineId} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default RoutineDetail
