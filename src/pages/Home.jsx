import { useNavigate } from 'react-router-dom'
import { History } from 'lucide-react'
import { useRoutines } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage, Card } from '../components/ui/index.js'

function Home() {
  const navigate = useNavigate()
  const { data: routines, isLoading, error } = useRoutines()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-6 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mis Rutinas</h1>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#21262d', color: '#8b949e' }}
          >
            <History size={16} />
            Histórico
          </button>
        </div>
      </header>
      <main>
        {routines?.length === 0 ? (
          <p className="text-secondary">No hay rutinas disponibles</p>
        ) : (
          <ul className="space-y-2">
            {routines?.map(routine => (
              <li key={routine.id}>
                <Card
                  className="p-4"
                  onClick={() => navigate(`/routine/${routine.id}`)}
                >
                  <h2 className="font-semibold text-accent">{routine.nombre}</h2>
                  {routine.descripcion && (
                    <p className="text-sm text-secondary mt-1">{routine.descripcion}</p>
                  )}
                  {routine.objetivo && (
                    <p className="text-sm mt-2">
                      <span style={{ color: '#3fb950' }}>Objetivo:</span>{' '}
                      <span className="text-secondary">{routine.objetivo}</span>
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default Home
