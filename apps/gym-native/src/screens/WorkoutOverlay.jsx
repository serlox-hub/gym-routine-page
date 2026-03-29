import { View, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import useWorkoutStore from '../stores/workoutStore'
import { useRoutineDay } from '../hooks/useRoutines'
import { WorkoutSessionLayout, WorkoutLoadingScreen } from '../components/Workout'
import { colors } from '../lib/styles'

export default function WorkoutOverlay() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const workoutVisible = useWorkoutStore(state => state.workoutVisible)
  const { data: day } = useRoutineDay(routineDayId)

  if (!workoutVisible && !sessionId) return null

  const title = routineDayId ? (day?.name || t('workout:session.active')) : t('workout:session.freeWorkout')

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
    backgroundColor: colors.bgPrimary,
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
