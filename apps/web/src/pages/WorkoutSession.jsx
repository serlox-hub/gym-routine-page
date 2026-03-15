import { useParams } from 'react-router-dom'
import { useRoutineDay } from '../hooks/useRoutines.js'
import { WorkoutSessionLayout } from '../components/Workout/index.js'

function WorkoutSession() {
  const { routineId, dayId } = useParams()
  const { data: day } = useRoutineDay(dayId)

  return (
    <WorkoutSessionLayout
      title={day?.name || 'Sesión en curso'}
      fallbackRoute={`/routine/${routineId}`}
    />
  )
}

export default WorkoutSession
