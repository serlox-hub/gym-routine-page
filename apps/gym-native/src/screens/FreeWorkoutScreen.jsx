import { useTranslation } from 'react-i18next'
import { WorkoutSessionLayout } from '../components/Workout'

export default function FreeWorkoutScreen({ navigation }) {
  const { t } = useTranslation()
  return (
    <WorkoutSessionLayout
      title={t('workout:session.freeWorkout')}
      navigation={navigation}
      fallbackRoute="Home"
    />
  )
}
