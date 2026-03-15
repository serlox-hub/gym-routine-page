import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, X } from 'lucide-react'
import { useWorkoutHistory } from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Card, PageHeader } from '../components/ui/index.js'
import { MonthlyCalendar, DurationChart } from '../components/History/index.js'
import { formatTime } from '@gym/shared'
import { colors } from '../lib/styles.js'

function History() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const { data: sessions, isLoading, error } = useWorkoutHistory(currentDate)
  const [selectedDay, setSelectedDay] = useState(null)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDayClick = (dayData) => {
    if (dayData.sessions.length === 1) {
      navigate(`/history/${dayData.sessions[0].id}`)
    } else if (dayData.sessions.length > 1) {
      setSelectedDay(dayData)
    }
  }

  const handleSessionSelect = (sessionId) => {
    setSelectedDay(null)
    navigate(`/history/${sessionId}`)
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <PageHeader title="Histórico" backTo="/" />

      <main>
        {!sessions || sessions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
            <p className="text-secondary">No hay sesiones registradas</p>
          </div>
        ) : (
          <>
            <MonthlyCalendar
              sessions={sessions}
              onDayClick={handleDayClick}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
            />
            <DurationChart sessions={sessions} currentDate={currentDate} />
          </>
        )}
      </main>

      {/* Modal de selección de sesión */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg p-4"
            style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {selectedDay.sessions.length} sesiones este día
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded hover:opacity-80"
                style={{ backgroundColor: colors.bgTertiary }}
              >
                <X size={18} style={{ color: colors.textSecondary }} />
              </button>
            </div>
            <div className="space-y-2">
              {selectedDay.sessions.map(session => (
                <Card
                  key={session.id}
                  className="p-3"
                  onClick={() => handleSessionSelect(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {session.day_name || session.routine_day?.name || 'Entrenamiento Libre'}
                      </div>
                      <div className="text-sm text-secondary">
                        {formatTime(session.started_at)}
                        {session.duration_minutes && ` · ${session.duration_minutes} min`}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default History
