import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Dumbbell, LogOut, Plus, Upload, Zap, MoreVertical } from 'lucide-react'
import { useRoutines } from '../hooks/useRoutines.js'
import { useStartSession } from '../hooks/useWorkout.js'
import { useAuth, useUserId } from '../hooks/useAuth.js'
import { LoadingSpinner, ErrorMessage, Card } from '../components/ui/index.js'
import { importRoutine, readJsonFile } from '../lib/routineIO.js'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import useWorkoutStore from '../stores/workoutStore.js'

function Home() {
  const navigate = useNavigate()
  const { data: routines, isLoading, error } = useRoutines()
  const { logout } = useAuth()
  const userId = useUserId()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const startSessionMutation = useStartSession()
  const [showMenu, setShowMenu] = useState(false)

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

  const handleStartFreeWorkout = () => {
    startSessionMutation.mutate(undefined, {
      onSuccess: () => navigate('/workout/free')
    })
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-6 border-b border-border pb-4">
        <div className="flex items-center justify-end">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
            >
              <MoreVertical size={20} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg min-w-[160px]"
                  style={{ backgroundColor: '#21262d', border: '1px solid #30363d' }}
                >
                  <button
                    onClick={() => { navigate('/exercises'); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                    style={{ color: '#e6edf3' }}
                  >
                    <Dumbbell size={16} style={{ color: '#8b949e' }} />
                    Ejercicios
                  </button>
                  <button
                    onClick={() => { navigate('/history'); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                    style={{ color: '#e6edf3' }}
                  >
                    <History size={16} style={{ color: '#8b949e' }} />
                    Histórico
                  </button>
                  <div style={{ borderTop: '1px solid #30363d', margin: '4px 0' }} />
                  <button
                    onClick={() => { handleLogout(); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                    style={{ color: '#f85149' }}
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mb-6">
        <Card
          className="p-4"
          onClick={!hasActiveSession && !startSessionMutation.isPending ? handleStartFreeWorkout : undefined}
          style={hasActiveSession ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'rgba(136, 87, 229, 0.15)' }}
            >
              <Zap size={24} style={{ color: '#8957e5' }} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold" style={{ color: '#8957e5' }}>
                {startSessionMutation.isPending ? 'Iniciando...' : 'Entrenamiento Libre'}
              </h2>
              <p className="text-sm text-secondary">
                Entrena sin rutina, añade ejercicios sobre la marcha
              </p>
            </div>
          </div>
        </Card>
      </section>

      <main>
        <h2 className="text-lg font-semibold mb-3 text-secondary">Mis Rutinas</h2>
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
