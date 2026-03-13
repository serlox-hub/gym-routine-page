import { WorkoutSessionLayout } from '../components/Workout'

export default function FreeWorkoutScreen({ navigation }) {
  return (
    <WorkoutSessionLayout
      title="Entrenamiento Libre"
      navigation={navigation}
      fallbackRoute="Home"
    />
  )
}
