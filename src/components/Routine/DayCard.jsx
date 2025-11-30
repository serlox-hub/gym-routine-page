import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/index.js'

function DayCard({ day, routineId }) {
  const navigate = useNavigate()
  const { id, dia_numero, nombre, duracion_estimada_min } = day

  const handleClick = () => {
    navigate(`/routine/${routineId}/day/${id}`)
  }

  return (
    <Card className="p-4" onClick={handleClick}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-accent font-semibold">Día {dia_numero}</span>
          <h3 className="font-medium">{nombre}</h3>
        </div>
        {duracion_estimada_min && (
          <span className="text-sm text-muted">{duracion_estimada_min} min</span>
        )}
      </div>
    </Card>
  )
}

export default DayCard
