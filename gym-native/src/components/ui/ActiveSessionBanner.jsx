import { View, Text, Pressable } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Play } from 'lucide-react-native'
import useWorkoutStore from '../../stores/workoutStore'
import { formatSecondsToMMSS } from '../../lib/timeUtils'

export default function ActiveSessionBanner() {
  const navigation = useNavigation()
  const route = useRoute()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const routineId = useWorkoutStore(state => state.routineId)
  const restTimerActive = useWorkoutStore(state => state.restTimerActive)
  const getTimeRemaining = useWorkoutStore(state => state.getTimeRemaining)

  if (!sessionId) return null

  const isOnWorkoutPage = route.name?.includes('Workout')
  if (isOnWorkoutPage) return null

  const timeRemaining = restTimerActive ? getTimeRemaining() : 0

  const handleContinue = () => {
    if (routineDayId && routineId) {
      navigation.navigate('Workout', { routineId, dayId: routineDayId })
    } else {
      navigation.navigate('FreeWorkout')
    }
  }

  const isCritical = timeRemaining <= 3
  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const timerColor = isCritical ? '#f85149' : isWarning ? '#d29922' : '#ffffff'

  return (
    <View className="absolute top-2 self-center z-50">
      <View
        className="items-center gap-1 px-4 py-2 rounded-lg"
        style={{ backgroundColor: '#161b22', borderWidth: 2, borderColor: '#58a6ff' }}
      >
        <Text className="text-xs font-medium" style={{ color: '#58a6ff' }}>
          Entrenamiento en curso
        </Text>
        {restTimerActive && timeRemaining > 0 && (
          <Text className="font-mono font-bold text-lg" style={{ color: timerColor }}>
            {formatSecondsToMMSS(timeRemaining)}
          </Text>
        )}
        <Pressable
          onPress={handleContinue}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-md"
          style={{ backgroundColor: 'rgba(35, 134, 54, 0.95)' }}
        >
          <Play size={14} color="#ffffff" fill="#ffffff" />
          <Text className="text-white text-sm font-medium">Volver</Text>
        </Pressable>
      </View>
    </View>
  )
}
