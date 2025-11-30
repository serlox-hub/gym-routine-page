import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Calendar } from 'lucide-react'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory.js'
import { LoadingSpinner, ErrorMessage } from '../components/ui/index.js'
import { MonthlyCalendar } from '../components/History/index.js'

function History() {
  const navigate = useNavigate()
  const { data: sessions, isLoading, error } = useWorkoutHistory()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleDayClick = (dayData) => {
    // Si hay una sola sesión, ir directamente a ella
    if (dayData.sessions.length === 1) {
      navigate(`/history/${dayData.sessions[0].id}`)
    }
    // Si hay múltiples sesiones, por ahora ir a la primera
    // TODO: podríamos mostrar un modal para elegir
    else if (dayData.sessions.length > 1) {
      navigate(`/history/${dayData.sessions[0].id}`)
    }
  }

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
          <MonthlyCalendar sessions={sessions} onDayClick={handleDayClick} />
        )}
      </main>
    </div>
  )
}

export default History
