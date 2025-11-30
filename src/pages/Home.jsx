import { useRoutines } from '../hooks/useRoutines.js'
import { QUERY_KEYS } from '../lib/constants.js'

function Home() {
  const { data: routines, isLoading, error } = useRoutines()

  if (isLoading) return <div className="p-4">Cargando...</div>
  if (error) return <div className="p-4 text-danger">Error: {error.message}</div>

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Mis Rutinas</h1>
      </header>
      <main>
        {routines?.length === 0 ? (
          <p className="text-secondary">No hay rutinas disponibles</p>
        ) : (
          <ul className="space-y-2">
            {routines?.map(routine => (
              <li
                key={routine.id}
                className="p-4 bg-surface-alt rounded-lg hover:bg-surface-hover cursor-pointer"
              >
                <h2 className="font-semibold">{routine.nombre}</h2>
                {routine.descripcion && (
                  <p className="text-sm text-secondary">{routine.descripcion}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default Home
