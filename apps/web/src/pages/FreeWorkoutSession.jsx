import { useTranslation } from 'react-i18next'
import { WorkoutSessionLayout } from '../components/Workout/index.js'

function FreeWorkoutSession() {
  const { t } = useTranslation()

  return (
    <WorkoutSessionLayout
      title={t('workout:session.freeWorkout')}
      fallbackRoute="/"
    />
  )
}

export default FreeWorkoutSession
