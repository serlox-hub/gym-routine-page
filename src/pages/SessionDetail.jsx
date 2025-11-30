import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Clock, Calendar, FileText } from 'lucide-react'
import { useSessionDetail } from '../hooks/useWorkoutHistory.js'
import { LoadingSpinner, ErrorMessage, Card } from '../components/ui/index.js'
import { SENSATION_LABELS } from '../lib/constants.js'

const RIR_LABELS = {
  [-1]: 'F',
  0: '0',
  1: '1',
  2: '2',
  3: '3+',
}

function SessionDetail() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { data: session, isLoading, error } = useSessionDetail(sessionId)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />
  if (!session) return <ErrorMessage message="Sesión no encontrada" className="m-4" />

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatSetValue = (set) => {
    const parts = []
    if (set.weight) {
      parts.push(`${set.weight}${set.weight_unit}`)
    }
    if (set.reps_completed) {
      parts.push(`${set.reps_completed} reps`)
    }
    if (set.time_seconds) {
      parts.push(`${set.time_seconds}s`)
    }
    if (set.distance_meters) {
      parts.push(`${set.distance_meters}m`)
    }
    return parts.join(' × ')
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-6">
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-1 text-sm mb-4 hover:opacity-80"
          style={{ color: '#58a6ff' }}
        >
          <ChevronLeft size={16} />
          Histórico
        </button>

        <h1 className="text-xl font-bold mb-1">
          {session.routine_day?.nombre || 'Sesión'}
        </h1>
        <p className="text-sm text-secondary">
          {session.routine_day?.routine?.nombre}
        </p>
      </header>

      {/* Info de la sesión */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} style={{ color: '#8b949e' }} />
            <div>
              <div className="text-xs text-secondary">Fecha</div>
              <div className="text-sm capitalize">{formatDate(session.started_at)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: '#8b949e' }} />
            <div>
              <div className="text-xs text-secondary">Hora</div>
              <div className="text-sm">{formatTime(session.started_at)}</div>
            </div>
          </div>
          {session.duration_minutes && (
            <div>
              <div className="text-xs text-secondary">Duración</div>
              <div className="text-sm">{session.duration_minutes} minutos</div>
            </div>
          )}
          {session.sensacion_general && (
            <div>
              <div className="text-xs text-secondary">Sensación</div>
              <span
                className="text-xs px-2 py-0.5 rounded inline-block mt-1"
                style={{
                  backgroundColor: getSensationColor(session.sensacion_general),
                  color: '#0d1117',
                }}
              >
                {SENSATION_LABELS[session.sensacion_general]}
              </span>
            </div>
          )}
        </div>
        {session.notas && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #30363d' }}>
            <div className="text-xs text-secondary mb-1">Notas</div>
            <p className="text-sm">{session.notas}</p>
          </div>
        )}
      </Card>

      {/* Ejercicios */}
      <h2 className="text-lg font-bold mb-3">Ejercicios</h2>
      <div className="space-y-3">
        {session.exercises?.map(({ exercise, sets }) => (
          <Card key={exercise.id} className="p-4">
            <h3 className="font-medium mb-3">{exercise.nombre}</h3>
            <div className="space-y-2">
              {sets.map(set => (
                <div
                  key={set.id}
                  className="flex items-center gap-3 py-2 px-3 rounded"
                  style={{ backgroundColor: '#21262d' }}
                >
                  <span
                    className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: '#3fb950', color: '#0d1117' }}
                  >
                    {set.set_number}
                  </span>
                  <div className="flex-1 text-sm">
                    {formatSetValue(set)}
                  </div>
                  {(set.rir_actual !== null || set.notas) && (
                    <div className="flex items-center gap-1">
                      {set.rir_actual !== null && (
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)', color: '#a371f7' }}
                        >
                          {RIR_LABELS[set.rir_actual] ?? set.rir_actual}
                        </span>
                      )}
                      {set.notas && (
                        <FileText size={12} style={{ color: '#a371f7' }} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function getSensationColor(value) {
  const colors = {
    1: '#f85149',
    2: '#d29922',
    3: '#8b949e',
    4: '#3fb950',
    5: '#58a6ff',
  }
  return colors[value] || '#8b949e'
}

export default SessionDetail
