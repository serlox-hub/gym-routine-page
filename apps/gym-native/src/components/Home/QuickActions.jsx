import { View, Text } from 'react-native'
import { Zap, Star } from 'lucide-react-native'
import { useStartSession } from '../../hooks/useWorkout'
import { Card } from '../ui'
import useWorkoutStore from '../../stores/workoutStore'
import { colors } from '../../lib/styles'

function QuickActions({ navigation, routines }) {
  const startSessionMutation = useStartSession()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const isFreeSessionActive = hasActiveSession && activeRoutineDayId === null
  const isRoutineSessionActive = hasActiveSession && activeRoutineDayId !== null
  const favoriteRoutine = routines?.find(r => r.is_favorite)

  const handleStartFreeWorkout = () => {
    useWorkoutStore.getState().showWorkout()
    startSessionMutation.mutate(undefined)
  }

  return (
    <View className="mb-6">
      <Text className="text-secondary text-sm font-medium mb-3">Acceso rápido</Text>

      <Card
        className="p-3 mb-2"
        onPress={
          isFreeSessionActive
            ? () => useWorkoutStore.getState().showWorkout()
            : isRoutineSessionActive
              ? undefined
              : !startSessionMutation.isPending
                ? handleStartFreeWorkout
                : undefined
        }
        style={isRoutineSessionActive ? { opacity: 0.5 } : {}}
      >
        <View className="flex-row items-center gap-3">
          <View className="p-2 rounded-lg" style={{ backgroundColor: colors.purpleAccentBg }}>
            <Zap size={20} color={colors.purpleAccent} />
          </View>
          <View className="flex-1">
            <Text className="font-medium text-sm" style={{ color: colors.purpleAccent }}>
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

export default QuickActions
