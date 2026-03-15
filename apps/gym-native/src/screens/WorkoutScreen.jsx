import { useRoutineDay } from '../hooks/useRoutines'
import { WorkoutSessionLayout } from '../components/Workout'

export default function WorkoutScreen({ route, navigation }) {
  const { dayId } = route.params
  const { data: day } = useRoutineDay(dayId)

  return (
    <WorkoutSessionLayout
      title={day?.name || 'Sesión en curso'}
      navigation={navigation}
      fallbackRoute="Home"
    />
  )
}
