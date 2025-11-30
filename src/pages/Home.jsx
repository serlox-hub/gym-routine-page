import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'

function Home() {
  const { data: routines, isLoading, error } = useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
      if (error) throw error
      return data
    }
  })

  if (isLoading) return <div className="p-4">Cargando...</div>
  if (error) return <div className="p-4 text-red-400">Error: {error.message}</div>

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Mis Rutinas</h1>
      </header>
      <main>
        {routines?.length === 0 ? (
          <p className="text-zinc-400">No hay rutinas disponibles</p>
        ) : (
          <ul className="space-y-2">
            {routines?.map(routine => (
              <li
                key={routine.id}
                className="p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 cursor-pointer"
              >
                <h2 className="font-semibold">{routine.nombre}</h2>
                {routine.descripcion && (
                  <p className="text-sm text-zinc-400">{routine.descripcion}</p>
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
