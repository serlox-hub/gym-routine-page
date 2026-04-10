import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import { useWorkoutHistory, formatTime, groupSessionsByDate } from '@gym/shared'
import { LoadingSpinner, ErrorMessage } from '../components/ui/index.js'
import { MonthlyCalendar } from '../components/History/index.js'
import SessionInlineDetail from '../components/History/SessionInlineDetail.jsx'
import { colors } from '../lib/styles.js'

function History() {
  const { t } = useTranslation()
  const location = useLocation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const { data: sessions, isLoading, error } = useWorkoutHistory(currentDate)
  const [selectedSessions, setSelectedSessions] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [selectedDateKey, setSelectedDateKey] = useState(null)
  const autoSelectedRef = useRef(null)

  // Navegar a sesión específica si viene por location.state
  const incomingSessionId = location.state?.sessionId
  const incomingSessionDate = location.state?.sessionDate
  useEffect(() => {
    if (!incomingSessionId) return

    // Cambiar al mes de la sesión si es diferente al actual
    if (incomingSessionDate) {
      const sessionDate = new Date(incomingSessionDate)
      if (sessionDate.getFullYear() !== currentDate.getFullYear() || sessionDate.getMonth() !== currentDate.getMonth()) {
        setCurrentDate(sessionDate)
        return
      }
    }

    if (!sessions || sessions.length === 0) return
    const sessionsByDate = groupSessionsByDate(sessions)
    for (const [dateKey, daySessions] of sessionsByDate) {
      const match = daySessions.find(s => s.id === incomingSessionId)
      if (match) {
        setSelectedDateKey(dateKey)
        setSelectedSessions(daySessions)
        setSelectedSessionId(incomingSessionId)
        autoSelectedRef.current = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
        window.history.replaceState({}, '')
        return
      }
    }
  }, [incomingSessionId, incomingSessionDate, sessions, currentDate])

  // Auto-seleccionar día de hoy al cargar (skip si hay incoming)
  useEffect(() => {
    if (incomingSessionId) return
    if (!sessions || sessions.length === 0) return
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
    if (autoSelectedRef.current === monthKey) return
    autoSelectedRef.current = monthKey

    const todayKey = new Date().toDateString()
    const todaySessions = groupSessionsByDate(sessions).get(todayKey)

    setSelectedDateKey(todayKey)
    if (todaySessions) {
      setSelectedSessions(todaySessions)
      setSelectedSessionId(todaySessions[0].id)
    } else {
      setSelectedSessions(null)
      setSelectedSessionId(null)
    }
  }, [incomingSessionId, sessions, currentDate])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDayClick = (dayData) => {
    setSelectedDateKey(dayData.dateKey)
    if (dayData.sessions && dayData.sessions.length > 0) {
      setSelectedSessions(dayData.sessions)
      setSelectedSessionId(dayData.sessions[0].id)
    } else {
      setSelectedSessions(null)
      setSelectedSessionId(null)
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      {!sessions || sessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
          <p style={{ color: colors.textSecondary }}>{t('workout:history.noSessions')}</p>
        </div>
      ) : (
        <>
          <MonthlyCalendar
            sessions={sessions}
            onDayClick={handleDayClick}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            selectedDateKey={selectedDateKey}
          />

          {/* Session selector (when multiple sessions on same day) */}
          {selectedSessions && selectedSessions.length > 1 && (
            <div className="flex gap-2 mt-4 mb-2 overflow-x-auto">
              {selectedSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: session.id === selectedSessionId ? colors.success : colors.bgTertiary,
                    color: session.id === selectedSessionId ? colors.bgPrimary : colors.textSecondary,
                  }}
                >
                  {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
                  {' · '}
                  {formatTime(session.started_at)}
                </button>
              ))}
            </div>
          )}

          {/* Inline session detail */}
          {selectedSessionId ? (
            <div className="mt-4">
              <SessionInlineDetail key={selectedSessionId} sessionId={selectedSessionId} />
            </div>
          ) : (
            <div className="text-center py-8">
              <p style={{ color: colors.textMuted, fontSize: 13 }}>
                {selectedDateKey ? t('workout:history.noSessionsDay') : t('workout:history.selectDay')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default History
