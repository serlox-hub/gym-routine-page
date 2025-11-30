import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Clock, Calendar } from 'lucide-react'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory.js'
import { LoadingSpinner, ErrorMessage, Card } from '../components/ui/index.js'
import { SessionTonnageChart, FrequencyCalendar } from '../components/History/index.js'
import { SENSATION_LABELS } from '../lib/constants.js'

function History() {
  const navigate = useNavigate()
  const { data: sessions, isLoading, error } = useWorkoutHistory()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Agrupar sesiones por fecha
  const groupedSessions = sessions?.reduce((groups, session) => {
    const date = new Date(session.started_at).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(session)
    return groups
  }, {})

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm mb-4 hover:opacity-80"
          style={{ color: '#58a6ff' }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>
        <h1 className="text-2xl font-bold">Histórico</h1>
      </header>

      <main>
        {!sessions || sessions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto mb-4" style={{ color: '#8b949e' }} />
            <p className="text-secondary">No hay sesiones registradas</p>
          </div>
        ) : (
          <div className="space-y-6">
            <FrequencyCalendar sessions={sessions} />
            <SessionTonnageChart sessions={sessions} />
            {Object.entries(groupedSessions).map(([date, daySessions]) => (
              <div key={date}>
                <h2
                  className="text-sm font-medium mb-3 capitalize"
                  style={{ color: '#8b949e' }}
                >
                  {formatDate(daySessions[0].started_at)}
                </h2>
                <div className="space-y-2">
                  {daySessions.map(session => (
                    <Card
                      key={session.id}
                      className="p-4"
                      onClick={() => navigate(`/history/${session.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate mb-1">
                            {session.routine_day?.nombre || 'Sesión'}
                          </h3>
                          <p className="text-sm text-secondary truncate">
                            {session.routine_day?.routine?.nombre}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm" style={{ color: '#8b949e' }}>
                            <Clock size={14} />
                            {formatTime(session.started_at)}
                          </div>
                          {session.duration_minutes && (
                            <p className="text-xs text-secondary mt-1">
                              {session.duration_minutes} min
                            </p>
                          )}
                        </div>
                      </div>
                      {session.sensacion_general && (
                        <div className="mt-2 pt-2" style={{ borderTop: '1px solid #30363d' }}>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: getSensationColor(session.sensacion_general),
                              color: '#0d1117',
                            }}
                          >
                            {SENSATION_LABELS[session.sensacion_general]}
                          </span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
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

export default History
