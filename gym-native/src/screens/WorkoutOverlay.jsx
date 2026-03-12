import { View, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import useWorkoutStore from '../stores/workoutStore'
import { useRoutineDay } from '../hooks/useRoutines'
import { WorkoutSessionLayout, WorkoutLoadingScreen } from '../components/Workout'

export default function WorkoutOverlay() {
  const navigation = useNavigation()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const workoutVisible = useWorkoutStore(state => state.workoutVisible)
  const { data: day } = useRoutineDay(routineDayId)

  if (!workoutVisible && !sessionId) return null

  const title = routineDayId ? (day?.name || 'Sesión en curso') : 'Entrenamiento Libre'

  return (
    <View style={[styles.overlay, workoutVisible ? styles.visible : styles.hidden]}>
      <SafeAreaProvider>
        {sessionId ? (
          <WorkoutSessionLayout
            title={title}
            navigation={navigation}
            fallbackRoute="Home"
          />
        ) : (
          <WorkoutLoadingScreen />
        )}
      </SafeAreaProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d1117',
  },
  visible: {
    zIndex: 100,
    opacity: 1,
  },
  hidden: {
    zIndex: -1,
    opacity: 0,
  },
})
