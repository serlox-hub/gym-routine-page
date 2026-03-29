import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRoutineDay } from '../hooks/useRoutines.js'
import { WorkoutSessionLayout } from '../components/Workout/index.js'

function WorkoutSession() {
  const { routineId, dayId } = useParams()
  const { t } = useTranslation()
  const { data: day } = useRoutineDay(dayId)

  return (
    <WorkoutSessionLayout
      title={day?.name || t('workout:session.active')}
      fallbackRoute={`/routine/${routineId}`}
    />
  )
}

export default WorkoutSession
