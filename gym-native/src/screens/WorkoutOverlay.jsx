import { useRef, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import useWorkoutStore from '../stores/workoutStore'
import { useRoutineDay } from '../hooks/useRoutines'
import { WorkoutSessionLayout } from '../components/Workout'

export default function WorkoutOverlay() {
  const navigation = useNavigation()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const { data: day } = useRoutineDay(routineDayId)
  const containerRef = useRef(null)

  useEffect(() => {
    let prev = useWorkoutStore.getState().workoutVisible
    const unsub = useWorkoutStore.subscribe((state) => {
      if (state.workoutVisible !== prev) {
        prev = state.workoutVisible
        containerRef.current?.setNativeProps({
          style: prev ? styles.visible : styles.hidden,
        })
      }
    })
    return unsub
  }, [])

  // Set initial visibility
  useEffect(() => {
    const visible = useWorkoutStore.getState().workoutVisible
    containerRef.current?.setNativeProps({
      style: visible ? styles.visible : styles.hidden,
    })
  }, [sessionId])

  if (!sessionId) return null

  const title = routineDayId ? (day?.name || 'Sesión en curso') : 'Entrenamiento Libre'

  return (
    <View ref={containerRef} style={[styles.overlay, styles.hidden]}>
      <SafeAreaProvider>
        <WorkoutSessionLayout
          title={title}
          navigation={navigation}
          fallbackRoute="Home"
        />
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
