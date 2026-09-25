import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import { useWorkoutHistory, useSelectedDaySessions, formatTime, getSessionsForDateKey, parseDateInput } from '@gym/shared'
import { LoadingSpinner, ErrorMessage } from '../components/ui/index.js'
import { MonthlyCalendar } from '../components/History/index.js'
import SessionInlineDetail from '../components/History/SessionInlineDetail.jsx'
import { colors } from '../lib/styles.js'

function History() {
  const { t } = useTranslation()
  const location = useLocation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const { data: sessions, isLoading, error } = useWorkoutHistory(currentDate)
  // Día y sesión seleccionados: las sesiones del día se derivan de la query, y si la sesión
  // abierta se mueve de fecha la selección la sigue (ver `useSelectedDaySessions`).
  const {
    selectedDateKey,
    setSelectedDateKey,
    selectedSessionId,
    setSelectedSessionId,
    selectedSessions,
  } = useSelectedDaySessions(sessions)
  const autoSelectedRef = useRef(null)

  // Navegar a un día (con sesión opcional) si viene por location.state.
  // `date` acepta ISO timestamp o YYYY-MM-DD. `sessionId` es opcional: si está y existe en el día, se abre esa; si no, la primera del día.
  const incomingDate = location.state?.date
  const incomingSessionId = location.state?.sessionId
  useEffect(() => {
    if (!incomingDate) return

    const target = parseDateInput(incomingDate)
    if (target.getFullYear() !== currentDate.getFullYear() || target.getMonth() !== currentDate.getMonth()) {
      setCurrentDate(target)
      return
    }

    if (!sessions || sessions.length === 0) return
    const dateKey = target.toDateString()
    const daySessions = getSessionsForDateKey(sessions, dateKey)
    const sessionToOpen = (incomingSessionId && daySessions.find(s => s.id === incomingSessionId)) || daySessions[0]

    setSelectedDateKey(dateKey)
    setSelectedSessionId(sessionToOpen?.id ?? null)
    autoSelectedRef.current = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
    window.history.replaceState({}, '')
  }, [incomingDate, incomingSessionId, sessions, currentDate, setSelectedDateKey, setSelectedSessionId])

  // Auto-seleccionar día de hoy al cargar (skip si hay incoming)
  useEffect(() => {
    if (incomingDate) return
    if (!sessions || sessions.length === 0) return
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
    if (autoSelectedRef.current === monthKey) return
    autoSelectedRef.current = monthKey

    const todayKey = new Date().toDateString()
    const todaySessions = getSessionsForDateKey(sessions, todayKey)

    setSelectedDateKey(todayKey)
    setSelectedSessionId(todaySessions[0]?.id ?? null)
  }, [incomingDate, sessions, currentDate, setSelectedDateKey, setSelectedSessionId])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDayClick = (dayData) => {
    setSelectedDateKey(dayData.dateKey)
    setSelectedSessionId(dayData.sessions?.[0]?.id ?? null)
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      <MonthlyCalendar
        sessions={sessions}
        onDayClick={handleDayClick}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        selectedDateKey={selectedDateKey}
      />

      {!sessions || sessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
          <p style={{ color: colors.textSecondary }}>{t('workout:history.noSessions')}</p>
        </div>
      ) : (
        <>
          {/* Session selector (when multiple sessions on same day) */}
          {selectedSessions.length > 1 && (
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
              <SessionInlineDetail key={selectedSessionId} sessionId={selectedSessionId} onSessionDeleted={() => {
                const remaining = selectedSessions.filter(s => s.id !== selectedSessionId)
                setSelectedSessionId(remaining[0]?.id ?? null)
              }} />
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
