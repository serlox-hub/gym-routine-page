import { useState } from 'react'
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import {
  History, Dumbbell, LogOut, Scale, Users, Settings,
} from 'lucide-react-native'
import { useRoutines } from '../hooks/useRoutines'
import { useAuth, useIsAdmin, useIsPremium } from '../hooks/useAuth'
import {
  LoadingSpinner, ErrorMessage, ConfirmModal, PlanBadge, DropdownMenu, ActiveSessionBanner,
} from '../components/ui'
import { QuickActions, RoutineList, NewRoutineFlow, WeeklyGoalWidget } from '../components/Home'
import useWorkoutStore from '../stores/workoutStore'

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation()
  const { data: routines, isLoading, error, refetch, isRefetching } = useRoutines()
  const { logout } = useAuth()
  const { isAdmin } = useIsAdmin()
  const isPremium = useIsPremium()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)

  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
    } catch {
      setIsLoggingOut(false)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const menuItems = [
    { icon: Dumbbell, label: t('common:nav.exercises'), onClick: () => navigation.navigate('Exercises') },
    { icon: History, label: t('common:nav.history'), onClick: () => navigation.navigate('History') },
    { icon: Scale, label: t('body:weight.title'), onClick: () => navigation.navigate('BodyMetrics') },
    isAdmin && { icon: Users, label: t('common:nav.admin'), onClick: () => navigation.navigate('AdminUsers') },
    { type: 'separator' },
    { icon: Settings, label: t('common:nav.preferences'), onClick: () => navigation.navigate('Preferences') },
    { icon: LogOut, label: t('common:nav.logout'), onClick: handleLogoutClick, danger: true },
  ]

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-primary text-xl font-bold">{t('common:nav.home')}</Text>
          <PlanBadge isPremium={isPremium} />
        </View>
        <DropdownMenu items={menuItems} />
      </View>

      <RoutineList
        routines={routines}
        navigation={navigation}
        onNewRoutine={() => setShowNewRoutineModal(true)}
        ListHeaderComponent={
          <>
            <WeeklyGoalWidget navigation={navigation} onOpenSettings={() => navigation.navigate('Preferences')} />
            <QuickActions navigation={navigation} routines={routines} />
          </>
        }
        refreshing={isRefetching}
        onRefresh={refetch}
      />

      <NewRoutineFlow
        isOpen={showNewRoutineModal}
        onClose={() => setShowNewRoutineModal(false)}
        navigation={navigation}
      />

      <ActiveSessionBanner />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title={t('auth:logout.activeSession')}
        message={t('auth:logout.activeSessionMessage')}
        confirmText={t('common:nav.logout')}
        cancelText={t('auth:logout.continueTraining')}
        loadingText={t('auth:logout.loggingOut')}
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </SafeAreaView>
  )
}
