import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { History, Dumbbell, LogOut, Scale, Users, Settings } from 'lucide-react'
import { useRoutines } from '../hooks/useRoutines.js'
import { useAuth, useIsAdmin, useIsPremium } from '../hooks/useAuth.js'
import { LoadingSpinner, ErrorMessage, ConfirmModal, PlanBadge, PageHeader } from '../components/ui/index.js'
import { QuickActions, RoutineList, NewRoutineFlow, WeeklyGoalWidget } from '../components/Home/index.js'
import useWorkoutStore from '../stores/workoutStore.js'

function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()
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
    { icon: Dumbbell, label: t('common:nav.exercises'), onClick: () => navigate('/exercises') },
    { icon: History, label: t('common:nav.history'), onClick: () => navigate('/history') },
    { icon: Scale, label: t('body:weight.title'), onClick: () => navigate('/body-metrics') },
    isAdmin && { icon: Users, label: t('common:nav.admin'), onClick: () => navigate('/admin/users') },
    { type: 'separator' },
    { icon: Settings, label: t('common:nav.preferences'), onClick: () => navigate('/preferences') },
    { icon: LogOut, label: t('common:nav.logout'), onClick: handleLogoutClick, danger: true }
  ]

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <PageHeader
        title={t('common:nav.home')}
        titleExtra={<PlanBadge isPremium={isPremium} />}
        menuItems={menuItems}
      />

      <WeeklyGoalWidget onOpenSettings={() => navigate('/preferences')} />

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
        title={t('auth:logout.activeSession')}
        message={t('auth:logout.confirm')}
        confirmText={t('common:nav.logout')}
        cancelText={t('common:buttons.continue')}
        loadingText={t('common:buttons.loading')}
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}

export default Home
