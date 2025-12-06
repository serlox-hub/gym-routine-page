import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Dumbbell, LogOut, Plus, Upload } from 'lucide-react'
import { useRoutines } from '../hooks/useRoutines.js'
import { useAuth, useUserId } from '../hooks/useAuth.js'
import { LoadingSpinner, ErrorMessage, Card } from '../components/ui/index.js'
import { importRoutine, readJsonFile } from '../lib/routineIO.js'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'

function Home() {
  const navigate = useNavigate()
  const { data: routines, isLoading, error } = useRoutines()
  const { logout } = useAuth()
  const userId = useUserId()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await readJsonFile(file)
      const newRoutine = await importRoutine(data, userId)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      navigate(`/routine/${newRoutine.id}`)
    } catch (err) {
      console.error('Error importando rutina:', err)
      alert('Error al importar la rutina')
    }

    e.target.value = ''
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-6 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mis Rutinas</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/exercises')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
            >
              <Dumbbell size={16} />
              Ejercicios
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
            >
              <History size={16} />
              Histórico
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main>
        <ul className="space-y-2">
          {routines?.map(routine => (
            <li key={routine.id}>
              <Card
                className="p-4"
                onClick={() => navigate(`/routine/${routine.id}`)}
              >
                <h2 className="font-semibold text-accent">{routine.name}</h2>
                {routine.description && (
                  <p className="text-sm text-secondary mt-1">{routine.description}</p>
                )}
                {routine.goal && (
                  <p className="text-sm mt-2">
                    <span style={{ color: '#3fb950' }}>Objetivo:</span>{' '}
                    <span className="text-secondary">{routine.goal}</span>
                  </p>
                )}
              </Card>
            </li>
          ))}
          <li>
            <Card
              className="p-4 border-dashed"
              onClick={() => navigate('/routines/new')}
            >
              <div className="flex items-center gap-2 justify-center" style={{ color: '#8b949e' }}>
                <Plus size={20} />
                <span>Nueva rutina</span>
              </div>
            </Card>
          </li>
          <li>
            <Card
              className="p-4 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-center gap-2 justify-center" style={{ color: '#8b949e' }}>
                <Upload size={20} />
                <span>Importar rutina</span>
              </div>
            </Card>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </li>
        </ul>
      </main>
    </div>
  )
}

export default Home
