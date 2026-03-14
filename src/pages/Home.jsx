import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Dumbbell, LogOut, Scale, Users, Settings } from 'lucide-react'
import { useRoutines } from '../hooks/useRoutines.js'
import { useAuth, useIsAdmin, useIsPremium } from '../hooks/useAuth.js'
import { LoadingSpinner, ErrorMessage, ConfirmModal, PlanBadge, PageHeader } from '../components/ui/index.js'
import { QuickActions, RoutineList, NewRoutineFlow } from '../components/Home/index.js'
import useWorkoutStore from '../stores/workoutStore.js'

function Home() {
  const navigate = useNavigate()
  const { data: routines, isLoading, error } = useRoutines()
  const { logout } = useAuth()
  const { isAdmin } = useIsAdmin()
  const isPremium = useIsPremium()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const favoriteRoutine = routines?.find(r => r.is_favorite)

  const handleLogoutClick = () => {
    if (hasActiveSession) {
      setShowLogoutConfirm(true)
    } else {
      handleLogout()
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/')
    } catch {
      setIsLoggingOut(false)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const menuItems = [
    { icon: Dumbbell, label: 'Ejercicios', onClick: () => navigate('/exercises') },
    { icon: History, label: 'Histórico', onClick: () => navigate('/history') },
    { icon: Scale, label: 'Registro Corporal', onClick: () => navigate('/body-metrics') },
    isAdmin && { icon: Users, label: 'Gestión usuarios', onClick: () => navigate('/admin/users') },
    { type: 'separator' },
    { icon: Settings, label: 'Preferencias', onClick: () => navigate('/preferences') },
    { icon: LogOut, label: 'Cerrar sesión', onClick: handleLogoutClick, danger: true }
  ]

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <PageHeader
        title="Inicio"
        titleExtra={<PlanBadge isPremium={isPremium} />}
        menuItems={menuItems}
      />

      <QuickActions favoriteRoutine={favoriteRoutine} />

      <RoutineList
        routines={routines}
        onNewRoutine={() => setShowNewRoutineModal(true)}
      />

      <NewRoutineFlow
        isOpen={showNewRoutineModal}
        onClose={() => setShowNewRoutineModal(false)}
      />

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
    </div>
  )
}

export default Home
