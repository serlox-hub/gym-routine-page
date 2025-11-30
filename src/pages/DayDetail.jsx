import { useParams, useNavigate } from 'react-router-dom'
import { useRoutineDay, useRoutineBlocks } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage } from '../components/ui/index.js'
import { BlockSection } from '../components/Routine/index.js'

function DayDetail() {
  const { routineId, dayId } = useParams()
  const navigate = useNavigate()

  const { data: day, isLoading: loadingDay, error: dayError } = useRoutineDay(dayId)
  const { data: blocks, isLoading: loadingBlocks, error: blocksError } = useRoutineBlocks(dayId)

  const isLoading = loadingDay || loadingBlocks
  const error = dayError || blocksError

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-6">
        <button
          onClick={() => navigate(`/routine/${routineId}`)}
          className="text-secondary hover:text-accent mb-2 transition-colors"
        >
          ← Volver
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span
              className="text-sm font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(88, 166, 255, 0.15)', color: '#58a6ff' }}
            >
              Día {day.dia_numero}
            </span>
            <h1 className="text-xl font-bold">{day.nombre}</h1>
          </div>
          {day.duracion_estimada_min && (
            <span className="text-sm text-muted">
              {day.duracion_estimada_min} min
            </span>
          )}
        </div>
      </header>

      <main className="space-y-6">
        {blocks?.length === 0 ? (
          <p className="text-secondary">No hay ejercicios configurados</p>
        ) : (
          blocks?.map(block => (
            <BlockSection key={block.id} block={block} />
          ))
        )}
      </main>
    </div>
  )
}

export default DayDetail
