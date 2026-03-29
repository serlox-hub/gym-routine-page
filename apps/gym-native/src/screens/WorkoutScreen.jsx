import { useTranslation } from 'react-i18next'
import { useRoutineDay } from '../hooks/useRoutines'
import { WorkoutSessionLayout } from '../components/Workout'

export default function WorkoutScreen({ route, navigation }) {
  const { t } = useTranslation()
  const { dayId } = route.params
  const { data: day } = useRoutineDay(dayId)

  return (
    <WorkoutSessionLayout
      title={day?.name || t('workout:session.active')}
      navigation={navigation}
      fallbackRoute="Home"
    />
  )
}
