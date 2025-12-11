import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Dumbbell, LogOut, Plus, Upload, Zap, MoreVertical, Star, FileText, Bot, RefreshCw, LayoutTemplate, Scale, Users, Trash2, X, Check, Settings } from 'lucide-react'
import { useRoutines, useSetFavoriteRoutine, useDeleteRoutines } from '../hooks/useRoutines.js'
import { useStartSession } from '../hooks/useWorkout.js'
import { useAuth, useUserId, useIsAdmin, useIsPremium } from '../hooks/useAuth.js'
import { LoadingSpinner, ErrorMessage, Card, ImportOptionsModal, TruncatedText, ConfirmModal, PlanBadge } from '../components/ui/index.js'
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
  const isPremium = useIsPremium()
  const queryClient = useQueryClient()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const isFreeSessionActive = hasActiveSession && activeRoutineDayId === null
  const isRoutineSessionActive = hasActiveSession && activeRoutineDayId !== null
  const startSessionMutation = useStartSession()
  const setFavoriteMutation = useSetFavoriteRoutine()
  const deleteRoutinesMutation = useDeleteRoutines()
  const [showMenu, setShowMenu] = useState(false)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedRoutines, setSelectedRoutines] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false)
  const [showChatbotModal, setShowChatbotModal] = useState(false)
  const [showAdaptModal, setShowAdaptModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [pendingImportData, setPendingImportData] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importType, setImportType] = useState(null)

  const favoriteRoutine = routines?.find(r => r.is_favorite)

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    setSelectedRoutines(new Set())
  }

  const toggleRoutineSelection = (routineId) => {
    const newSelected = new Set(selectedRoutines)
    if (newSelected.has(routineId)) {
      newSelected.delete(routineId)
    } else {
      newSelected.add(routineId)
    }
    setSelectedRoutines(newSelected)
  }

  const handleDeleteSelected = async () => {
    try {
      await deleteRoutinesMutation.mutateAsync([...selectedRoutines])
      setShowDeleteConfirm(false)
      setIsSelectMode(false)
      setSelectedRoutines(new Set())
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleLogoutClick = () => {
    if (hasActiveSession) {
      setShowLogoutConfirm(true)
      setShowMenu(false)
    } else {
      handleLogout()
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login')
    } catch {
      setIsLoggingOut(false)
    }
  }

  const handleImportData = (data) => {
    setPendingImportData(data)
    setShowImportModal(false)
    setShowImportOptions(true)
  }

  const handleImportConfirm = async (options) => {
    if (!pendingImportData) return
    setImportType('json')
    setIsImporting(true)
    setShowImportOptions(false)

    try {
      await importRoutine(pendingImportData, userId, options)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    } catch (err) {
      alert(`Error al importar la rutina: ${err.message}`)
    } finally {
      setIsImporting(false)
      setImportType(null)
      setPendingImportData(null)
    }
  }

  const handleTemplateImport = async (templateData) => {
    setImportType('template')
    setIsImporting(true)
    setShowTemplatesModal(false)
    try {
      await importRoutine(templateData, userId, { updateExercises: false })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    } catch (err) {
      alert(`Error al importar la rutina: ${err.message}`)
    } finally {
      setIsImporting(false)
      setImportType(null)
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
              {isSelectMode ? `${selectedRoutines.size} seleccionadas` : 'Inicio'}
            </h1>
            {!isSelectMode && <PlanBadge isPremium={isPremium} />}
          </div>
          <div className="flex items-center gap-2">
            {isSelectMode ? (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedRoutines.size === 0}
                  className="p-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: '#21262d', color: selectedRoutines.size > 0 ? colors.danger : '#8b949e' }}
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={toggleSelectMode}
                  className="p-2 rounded-lg transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#21262d', color: '#8b949e' }}
                >
                  <X size={20} />
                </button>
              </>
            ) : (
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
                  className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg min-w-[200px]"
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
                    onClick={() => { navigate('/body-metrics'); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                    style={{ color: '#e6edf3' }}
                  >
                    <Scale size={16} style={{ color: '#8b949e' }} />
                    Registro Corporal
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
                  {routines?.length > 0 && (
                    <>
                      <div style={{ borderTop: '1px solid #30363d', margin: '4px 0' }} />
                      <button
                        onClick={() => { toggleSelectMode(); setShowMenu(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                        style={{ color: '#e6edf3' }}
                      >
                        <FileText size={16} style={{ color: '#8b949e' }} />
                        Gestionar rutinas
                      </button>
                    </>
                  )}
                  <div style={{ borderTop: '1px solid #30363d', margin: '4px 0' }} />
                  <button
                    onClick={() => { navigate('/preferences'); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                    style={{ color: '#e6edf3' }}
                  >
                    <Settings size={16} style={{ color: '#8b949e' }} />
                    Preferencias
                  </button>
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
            )}
          </div>
        </div>
      </header>

      <section className="mb-6">
        <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Acceso rápido</h2>
        <div className="space-y-2">
          <Card
            className="p-3"
            onClick={
              isFreeSessionActive
                ? () => navigate('/workout/free')
                : isRoutineSessionActive
                  ? undefined
                  : !startSessionMutation.isPending
                    ? handleStartFreeWorkout
                    : undefined
            }
            style={isRoutineSessionActive ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
                  {startSessionMutation.isPending
                    ? 'Iniciando...'
                    : isFreeSessionActive
                      ? 'Continuar Entrenamiento'
                      : 'Entrenamiento Libre'}
                </h3>
                {isRoutineSessionActive && (
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Tienes un entrenamiento de rutina en curso
                  </p>
                )}
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
          {!isSelectMode && (
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
          )}
          {routines?.map(routine => (
            <li key={routine.id}>
              <Card
                className="p-3"
                onClick={isSelectMode ? () => toggleRoutineSelection(routine.id) : undefined}
              >
                <div className={`flex justify-between gap-3 ${routine.description || routine.goal ? 'items-start' : 'items-center'}`}>
                  {isSelectMode && (
                    <div
                      className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        borderColor: selectedRoutines.has(routine.id) ? colors.accent : colors.border,
                        backgroundColor: selectedRoutines.has(routine.id) ? colors.accent : 'transparent'
                      }}
                    >
                      {selectedRoutines.has(routine.id) && <Check size={12} style={{ color: '#fff' }} />}
                    </div>
                  )}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={!isSelectMode ? () => navigate(`/routine/${routine.id}`) : undefined}
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
                  {!isSelectMode && (
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
                  )}
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
          onSelect={handleTemplateImport}
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

      {isImporting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner />
            <span style={{ color: colors.textPrimary }}>
              {importType === 'template' ? 'Creando rutina...' : 'Importando rutina...'}
            </span>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sesión de entrenamiento activa"
        message="Tienes un entrenamiento en curso. Si cierras sesión, perderás el progreso no guardado."
        confirmText="Cerrar sesión"
        cancelText="Continuar entrenando"
        loadingText="Cerrando sesión..."
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Eliminar rutinas"
        message={`¿Seguro que quieres eliminar ${selectedRoutines.size} rutina${selectedRoutines.size > 1 ? 's' : ''}? Se eliminarán todos los días y ejercicios asociados.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        loadingText="Eliminando..."
        isLoading={deleteRoutinesMutation.isPending}
        onConfirm={handleDeleteSelected}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

export default Home
