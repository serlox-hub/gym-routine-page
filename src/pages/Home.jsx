import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Dumbbell, LogOut, Plus, Upload, Zap, MoreVertical, Star, FileText, Bot, RefreshCw, LayoutTemplate, Scale, Users } from 'lucide-react'
import { useRoutines, useSetFavoriteRoutine } from '../hooks/useRoutines.js'
import { useStartSession } from '../hooks/useWorkout.js'
import { useAuth, useUserId, useIsAdmin } from '../hooks/useAuth.js'
import { LoadingSpinner, ErrorMessage, Card, ImportOptionsModal, TruncatedText, ConfirmModal } from '../components/ui/index.js'
import { ChatbotPromptModal, AdaptRoutineModal, TemplatesModal, ImportRoutineModal } from '../components/Routine/index.js'
import { importRoutine } from '../lib/routineIO.js'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import useWorkoutStore from '../stores/workoutStore.js'
import { colors } from '../lib/styles.js'

function Home() {
  const navigate = useNavigate()
  const { data: routines, isLoading, error } = useRoutines()
  const { logout } = useAuth()
  const userId = useUserId()
  const { isAdmin } = useIsAdmin()
  const queryClient = useQueryClient()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const startSessionMutation = useStartSession()
  const setFavoriteMutation = useSetFavoriteRoutine()
  const [showMenu, setShowMenu] = useState(false)
  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false)
  const [showChatbotModal, setShowChatbotModal] = useState(false)
  const [showAdaptModal, setShowAdaptModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [pendingImportData, setPendingImportData] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const favoriteRoutine = routines?.find(r => r.is_favorite)

  const handleLogoutClick = () => {
    if (hasActiveSession) {
      setShowLogoutConfirm(true)
      setShowMenu(false)
    } else {
      handleLogout()
    }
  }

  const handleLogout = async () => {
    setShowLogoutConfirm(false)
    await logout()
    navigate('/login')
  }

  const handleImportData = (data) => {
    setPendingImportData(data)
    setShowImportModal(false)
    setShowImportOptions(true)
  }

  const handleImportConfirm = async (options) => {
    if (!pendingImportData) return

    try {
      const newRoutine = await importRoutine(pendingImportData, userId, options)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      navigate(`/routine/${newRoutine.id}`)
    } catch (err) {
      alert(`Error al importar la rutina: ${err.message}`)
    } finally {
      setShowImportOptions(false)
      setPendingImportData(null)
    }
  }

  const handleImportCancel = () => {
    setShowImportOptions(false)
    setPendingImportData(null)
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
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>Inicio</h1>
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
                  <button
                    onClick={() => { navigate('/body-weight'); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                    style={{ color: '#e6edf3' }}
                  >
                    <Scale size={16} style={{ color: '#8b949e' }} />
                    Peso Corporal
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { navigate('/admin/users'); setShowMenu(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                      style={{ color: '#e6edf3' }}
                    >
                      <Users size={16} style={{ color: '#a371f7' }} />
                      Gestión usuarios
                    </button>
                  )}
                  <div style={{ borderTop: '1px solid #30363d', margin: '4px 0' }} />
                  <button
                    onClick={() => { handleLogoutClick(); setShowMenu(false) }}
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
        <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Acceso rápido</h2>
        <div className="space-y-2">
          <Card
            className="p-3"
            onClick={!hasActiveSession && !startSessionMutation.isPending ? handleStartFreeWorkout : undefined}
            style={hasActiveSession ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'rgba(136, 87, 229, 0.15)' }}
              >
                <Zap size={20} style={{ color: '#8957e5' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm" style={{ color: '#8957e5' }}>
                  {startSessionMutation.isPending ? 'Iniciando...' : 'Entrenamiento Libre'}
                </h3>
              </div>
            </div>
          </Card>

          {favoriteRoutine && (
            <Card
              className="p-3"
              onClick={() => navigate(`/routine/${favoriteRoutine.id}`)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)' }}
                >
                  <Star size={20} style={{ color: colors.warning }} fill={colors.warning} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm" style={{ color: colors.warning }}>
                    {favoriteRoutine.name}
                  </h3>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>

      <main>
        <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Mis Rutinas</h2>
        <ul className="space-y-2">
          <li>
            <Card
              className="p-3 border-dashed"
              onClick={() => setShowNewRoutineModal(true)}
            >
              <div className="flex items-center gap-2 justify-center" style={{ color: colors.textSecondary }}>
                <Plus size={18} />
                <span className="text-sm">Nueva rutina</span>
              </div>
            </Card>
          </li>
          {routines?.map(routine => (
            <li key={routine.id}>
              <Card className="p-3">
                <div className={`flex justify-between gap-3 ${routine.description || routine.goal ? 'items-start' : 'items-center'}`}>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/routine/${routine.id}`)}
                  >
                    <h3 className="font-medium text-sm" style={{ color: colors.textPrimary }}>
                      {routine.name}
                    </h3>
                    {routine.description && (
                      <TruncatedText
                        text={routine.description}
                        className="text-xs mt-1"
                        style={{ color: colors.textSecondary }}
                      />
                    )}
                    {routine.goal && (
                      <p className="text-xs mt-1">
                        <span style={{ color: colors.success }}>Objetivo:</span>{' '}
                        <span style={{ color: colors.textSecondary }}>{routine.goal}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setFavoriteMutation.mutate({
                      routineId: routine.id,
                      isFavorite: !routine.is_favorite
                    })}
                    className="p-1 rounded hover:opacity-80 shrink-0"
                  >
                    <Star
                      size={18}
                      style={{ color: routine.is_favorite ? colors.warning : colors.textSecondary }}
                      fill={routine.is_favorite ? colors.warning : 'none'}
                    />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </main>

      {/* Modal Nueva Rutina */}
      {showNewRoutineModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setShowNewRoutineModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg p-4"
            style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-4" style={{ color: colors.textPrimary }}>Nueva rutina</h3>
            <div className="space-y-2">
              <Card
                className="p-3"
                onClick={() => {
                  setShowNewRoutineModal(false)
                  setShowTemplatesModal(true)
                }}
              >
                <div className="flex items-center gap-3">
                  <LayoutTemplate size={20} style={{ color: colors.success }} />
                  <div>
                    <h4 className="font-medium text-sm" style={{ color: colors.textPrimary }}>Rutinas predefinidas</h4>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>PPL, Upper/Lower, Full Body, 5/3/1</p>
                  </div>
                </div>
              </Card>
              <Card
                className="p-3"
                onClick={() => {
                  setShowNewRoutineModal(false)
                  navigate('/routines/new')
                }}
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} style={{ color: colors.accent }} />
                  <div>
                    <h4 className="font-medium text-sm" style={{ color: colors.textPrimary }}>Crear manualmente</h4>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>Configura tu rutina desde cero</p>
                  </div>
                </div>
              </Card>
              <Card
                className="p-3"
                onClick={() => {
                  setShowNewRoutineModal(false)
                  setShowImportModal(true)
                }}
              >
                <div className="flex items-center gap-3">
                  <Upload size={20} style={{ color: colors.success }} />
                  <div>
                    <h4 className="font-medium text-sm" style={{ color: colors.textPrimary }}>Importar JSON</h4>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>Desde archivo o pegando texto</p>
                  </div>
                </div>
              </Card>
              <Card
                className="p-3"
                onClick={() => {
                  setShowNewRoutineModal(false)
                  setShowChatbotModal(true)
                }}
              >
                <div className="flex items-center gap-3">
                  <Bot size={20} style={{ color: '#58a6ff' }} />
                  <div>
                    <h4 className="font-medium text-sm" style={{ color: colors.textPrimary }}>Crear con IA</h4>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>Genera un prompt para ChatGPT/Claude</p>
                  </div>
                </div>
              </Card>
              <Card
                className="p-3"
                onClick={() => {
                  setShowNewRoutineModal(false)
                  setShowAdaptModal(true)
                }}
              >
                <div className="flex items-center gap-3">
                  <RefreshCw size={20} style={{ color: '#f0883e' }} />
                  <div>
                    <h4 className="font-medium text-sm" style={{ color: colors.textPrimary }}>Adaptar rutina existente</h4>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>Convierte tu rutina actual con IA</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {showChatbotModal && (
        <ChatbotPromptModal
          onClose={() => setShowChatbotModal(false)}
          onImportClick={() => {
            setShowChatbotModal(false)
            setShowImportModal(true)
          }}
        />
      )}

      {showAdaptModal && (
        <AdaptRoutineModal
          onClose={() => setShowAdaptModal(false)}
          onImportClick={() => {
            setShowAdaptModal(false)
            setShowImportModal(true)
          }}
        />
      )}

      {showTemplatesModal && (
        <TemplatesModal
          onClose={() => setShowTemplatesModal(false)}
          onSelect={(templateData) => {
            setPendingImportData(templateData)
            setShowImportOptions(true)
          }}
        />
      )}

      <ImportRoutineModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportData}
      />

      <ImportOptionsModal
        isOpen={showImportOptions}
        onConfirm={handleImportConfirm}
        onCancel={handleImportCancel}
      />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sesión de entrenamiento activa"
        message="Tienes un entrenamiento en curso. Si cierras sesión, perderás el progreso no guardado."
        confirmText="Cerrar sesión"
        cancelText="Continuar entrenando"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}

export default Home
