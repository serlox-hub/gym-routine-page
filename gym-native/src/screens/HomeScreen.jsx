import { useState } from 'react'
import { View, Text, FlatList, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  History, Dumbbell, LogOut, Plus, Upload, Zap, Star,
  FileText, Bot, RefreshCw, LayoutTemplate, Scale, Users, Settings,
} from 'lucide-react-native'
import { useRoutines, useSetFavoriteRoutine } from '../hooks/useRoutines'
import { useStartSession } from '../hooks/useWorkout'
import { useAuth, useUserId, useIsAdmin, useIsPremium } from '../hooks/useAuth'
import {
  LoadingSpinner, ErrorMessage, Card, ImportOptionsModal,
  TruncatedText, ConfirmModal, PlanBadge, DropdownMenu,
} from '../components/ui'
import {
  TemplatesModal, ImportRoutineModal, ChatbotPromptModal, AdaptRoutineModal,
} from '../components/Routine'
import { importRoutine } from '../lib/routineIO'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants'
import useWorkoutStore from '../stores/workoutStore'
import { colors } from '../lib/styles'

function QuickAccessSection({ navigation, routines, startSessionMutation, hasActiveSession, activeRoutineDayId }) {
  const isFreeSessionActive = hasActiveSession && activeRoutineDayId === null
  const isRoutineSessionActive = hasActiveSession && activeRoutineDayId !== null
  const favoriteRoutine = routines?.find(r => r.is_favorite)

  const handleStartFreeWorkout = () => {
    startSessionMutation.mutate(undefined, {
      onSuccess: () => navigation.navigate('FreeWorkout'),
    })
  }

  return (
    <View className="mb-6">
      <Text className="text-secondary text-sm font-medium mb-3">Acceso rápido</Text>

      <Card
        className="p-3 mb-2"
        onPress={
          isFreeSessionActive
            ? () => navigation.navigate('FreeWorkout')
            : isRoutineSessionActive
              ? undefined
              : !startSessionMutation.isPending
                ? handleStartFreeWorkout
                : undefined
        }
        style={isRoutineSessionActive ? { opacity: 0.5 } : {}}
      >
        <View className="flex-row items-center gap-3">
          <View className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(136, 87, 229, 0.15)' }}>
            <Zap size={20} color="#8957e5" />
          </View>
          <View className="flex-1">
            <Text className="font-medium text-sm" style={{ color: '#8957e5' }}>
              {startSessionMutation.isPending
                ? 'Iniciando...'
                : isFreeSessionActive
                  ? 'Continuar Entrenamiento'
                  : 'Entrenamiento Libre'}
            </Text>
            {isRoutineSessionActive && (
              <Text className="text-secondary text-xs">
                Tienes un entrenamiento de rutina en curso
              </Text>
            )}
          </View>
        </View>
      </Card>

      {favoriteRoutine && (
        <Card
          className="p-3"
          onPress={() => navigation.navigate('RoutineDetail', { routineId: favoriteRoutine.id })}
        >
          <View className="flex-row items-center gap-3">
            <View className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)' }}>
              <Star size={20} color={colors.warning} fill={colors.warning} />
            </View>
            <Text className="font-medium text-sm flex-1" style={{ color: colors.warning }}>
              {favoriteRoutine.name}
            </Text>
          </View>
        </Card>
      )}
    </View>
  )
}

function RoutineItem({ routine, navigation, setFavoriteMutation }) {
  return (
    <Card
      className="p-3 mb-2"
      onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
    >
      <View className={`flex-row justify-between gap-3 ${routine.description || routine.goal ? 'items-start' : 'items-center'}`}>
        <View className="flex-1">
          <Text className="text-primary font-medium text-sm">{routine.name}</Text>
          {routine.description && (
            <TruncatedText
              text={routine.description}
              className="text-xs mt-1"
              style={{ color: colors.textSecondary }}
            />
          )}
          {routine.goal && (
            <Text className="text-xs mt-1">
              <Text style={{ color: colors.success }}>Objetivo: </Text>
              <Text className="text-secondary">{routine.goal}</Text>
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => {
            setFavoriteMutation.mutate({
              routineId: routine.id,
              isFavorite: !routine.is_favorite,
            })
          }}
          className="p-1"
        >
          <Star
            size={18}
            color={routine.is_favorite ? colors.warning : colors.textSecondary}
            fill={routine.is_favorite ? colors.warning : 'none'}
          />
        </Pressable>
      </View>
    </Card>
  )
}

export default function HomeScreen({ navigation }) {
  const { data: routines, isLoading, error, refetch, isRefetching } = useRoutines()
  const { logout } = useAuth()
  const userId = useUserId()
  const { isAdmin } = useIsAdmin()
  const isPremium = useIsPremium()
  const queryClient = useQueryClient()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const startSessionMutation = useStartSession()
  const setFavoriteMutation = useSetFavoriteRoutine()

  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showImportRoutine, setShowImportRoutine] = useState(false)
  const [showChatbot, setShowChatbot] = useState(false)
  const [showAdaptRoutine, setShowAdaptRoutine] = useState(false)
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [pendingImportData, setPendingImportData] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

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

  const handleTemplateImport = (templateData) => {
    setPendingImportData(templateData)
    setShowImportOptions(true)
  }

  const handleImportData = (data) => {
    setPendingImportData(data)
    setShowImportOptions(true)
  }

  const handleImportConfirm = async (options) => {
    if (!pendingImportData) return
    setIsImporting(true)
    setShowImportOptions(false)

    try {
      await importRoutine(pendingImportData, userId, options)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    } catch (err) {
      Alert.alert('Error', `Error al importar la rutina: ${err.message}`)
    } finally {
      setIsImporting(false)
      setPendingImportData(null)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const menuItems = [
    { icon: Dumbbell, label: 'Ejercicios', onClick: () => navigation.navigate('Exercises') },
    { icon: History, label: 'Histórico', onClick: () => navigation.navigate('History') },
    { icon: Scale, label: 'Registro Corporal', onClick: () => navigation.navigate('BodyMetrics') },
    isAdmin && { icon: Users, label: 'Gestión usuarios', onClick: () => navigation.navigate('AdminUsers') },
    { type: 'separator' },
    { icon: Settings, label: 'Preferencias', onClick: () => navigation.navigate('Preferences') },
    { icon: LogOut, label: 'Cerrar sesión', onClick: handleLogoutClick, danger: true },
  ]

  const newRoutineOptions = [
    {
      icon: LayoutTemplate,
      iconColor: colors.success,
      label: 'Rutinas predefinidas',
      description: 'PPL, Upper/Lower, Full Body, 5/3/1',
      onPress: () => {
        setShowNewRoutineModal(false)
        setShowTemplates(true)
      },
    },
    {
      icon: FileText,
      iconColor: colors.accent,
      label: 'Crear manualmente',
      description: 'Configura tu rutina desde cero',
      onPress: () => {
        setShowNewRoutineModal(false)
        navigation.navigate('NewRoutine')
      },
    },
    {
      icon: Upload,
      iconColor: colors.success,
      label: 'Importar JSON',
      description: 'Desde archivo o pegando texto',
      onPress: () => {
        setShowNewRoutineModal(false)
        setShowImportRoutine(true)
      },
    },
    {
      icon: Bot,
      iconColor: colors.accent,
      label: 'Crear con IA',
      description: 'Genera un prompt para ChatGPT/Claude',
      onPress: () => {
        setShowNewRoutineModal(false)
        setShowChatbot(true)
      },
    },
    {
      icon: RefreshCw,
      iconColor: '#f0883e',
      label: 'Adaptar rutina existente',
      description: 'Convierte tu rutina actual con IA',
      onPress: () => {
        setShowNewRoutineModal(false)
        setShowAdaptRoutine(true)
      },
    },
  ]

  const renderHeader = () => (
    <>
      <QuickAccessSection
        navigation={navigation}
        routines={routines}
        startSessionMutation={startSessionMutation}
        hasActiveSession={hasActiveSession}
        activeRoutineDayId={activeRoutineDayId}
      />
      <Text className="text-secondary text-sm font-medium mb-3">Mis Rutinas</Text>
      <Card
        className="p-3 mb-2"
        style={{ borderStyle: 'dashed' }}
        onPress={() => setShowNewRoutineModal(true)}
      >
        <View className="flex-row items-center gap-2 justify-center">
          <Plus size={18} color={colors.textSecondary} />
          <Text className="text-secondary text-sm">Nueva rutina</Text>
        </View>
      </Card>
    </>
  )

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-primary text-xl font-bold">Inicio</Text>
          <PlanBadge isPremium={isPremium} />
        </View>
        <DropdownMenu items={menuItems} />
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RoutineItem
            routine={item}
            navigation={navigation}
            setFavoriteMutation={setFavoriteMutation}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        refreshing={isRefetching}
        onRefresh={refetch}
      />

      {/* Modal Nueva Rutina */}
      {showNewRoutineModal && (
        <Pressable
          onPress={() => setShowNewRoutineModal(false)}
          className="absolute inset-0 z-50 justify-center items-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full bg-surface-card border border-border rounded-lg p-4"
            style={{ maxWidth: 400 }}
          >
            <Text className="text-primary font-semibold mb-4">Nueva rutina</Text>
            {newRoutineOptions.map((opt, i) => (
              <Card key={i} className="p-3 mb-2" onPress={opt.onPress}>
                <View className="flex-row items-center gap-3">
                  <opt.icon size={20} color={opt.iconColor} />
                  <View>
                    <Text className="text-primary font-medium text-sm">{opt.label}</Text>
                    <Text className="text-secondary text-xs">{opt.description}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </Pressable>
        </Pressable>
      )}

      {isImporting && (
        <View
          className="absolute inset-0 z-50 items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <LoadingSpinner />
          <Text className="text-primary mt-2">Importando rutina...</Text>
        </View>
      )}

      <ImportOptionsModal
        isOpen={showImportOptions}
        onConfirm={handleImportConfirm}
        onCancel={() => {
          setShowImportOptions(false)
          setPendingImportData(null)
        }}
      />

      <TemplatesModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleTemplateImport}
      />

      <ImportRoutineModal
        isOpen={showImportRoutine}
        onClose={() => setShowImportRoutine(false)}
        onImport={handleImportData}
      />

      <ChatbotPromptModal
        isOpen={showChatbot}
        onClose={() => setShowChatbot(false)}
        onImportClick={() => setShowImportRoutine(true)}
      />

      <AdaptRoutineModal
        isOpen={showAdaptRoutine}
        onClose={() => setShowAdaptRoutine(false)}
        onImportClick={() => setShowImportRoutine(true)}
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
    </SafeAreaView>
  )
}
