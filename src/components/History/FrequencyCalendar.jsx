import { useMemo } from 'react'

const DAYS_TO_SHOW = 84 // 12 semanas

function FrequencyCalendar({ sessions }) {
  const calendarData = useMemo(() => {
    if (!sessions) return { weeks: [], workoutDates: new Set() }

    // Crear set de fechas con entrenamientos
    const workoutDates = new Set(
      sessions.map(s => new Date(s.started_at).toDateString())
    )

    // Generar últimas 12 semanas
    const today = new Date()
    const weeks = []
    let currentWeek = []

    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)

      const dayOfWeek = date.getDay()
      const dateStr = date.toDateString()
      const hasWorkout = workoutDates.has(dateStr)
      const isToday = dateStr === today.toDateString()

      currentWeek.push({
        date,
        dateStr,
        hasWorkout,
        isToday,
        dayOfWeek,
      })

      // Nueva semana cuando llegamos a sábado o es el último día
      if (dayOfWeek === 6 || i === 0) {
        // Rellenar días vacíos al inicio de la primera semana
        if (weeks.length === 0 && currentWeek.length < 7) {
          const padding = Array(7 - currentWeek.length).fill(null)
          currentWeek = [...padding, ...currentWeek]
        }
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    return { weeks, workoutDates }
  }, [sessions])

  const { weeks, workoutDates } = calendarData

  // Contar entrenamientos del mes actual y semana actual
  const stats = useMemo(() => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())

    let monthCount = 0
    let weekCount = 0

    sessions?.forEach(s => {
      const sessionDate = new Date(s.started_at)
      if (sessionDate >= startOfMonth) monthCount++
      if (sessionDate >= startOfWeek) weekCount++
    })

    return { monthCount, weekCount }
  }, [sessions])

  if (!sessions || sessions.length === 0) {
    return null
  }

  const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  return (
    <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: '#e6edf3' }}>
          Frecuencia
        </h3>
        <div className="flex gap-3 text-xs" style={{ color: '#8b949e' }}>
          <span>Semana: <strong style={{ color: '#3fb950' }}>{stats.weekCount}</strong></span>
          <span>Mes: <strong style={{ color: '#58a6ff' }}>{stats.monthCount}</strong></span>
        </div>
      </div>

      <div className="flex gap-1">
        {/* Labels de días */}
        <div className="flex flex-col gap-1 mr-1">
          {dayLabels.map((label, i) => (
            <div
              key={i}
              className="w-3 h-3 flex items-center justify-center text-xs"
              style={{ color: '#8b949e', fontSize: 8 }}
            >
              {i % 2 === 1 ? label : ''}
            </div>
          ))}
        </div>

        {/* Grid de semanas */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => {
              if (!day) {
                return <div key={dayIndex} className="w-3 h-3" />
              }

              return (
                <div
                  key={dayIndex}
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: day.hasWorkout ? '#3fb950' : '#21262d',
                    opacity: day.hasWorkout ? 1 : 0.5,
                    border: day.isToday ? '1px solid #58a6ff' : 'none',
                  }}
                  title={`${day.date.toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}${day.hasWorkout ? ' - Entrenamiento' : ''}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 mt-3">
        <span className="text-xs" style={{ color: '#8b949e' }}>Menos</span>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#21262d' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3fb950' }} />
        <span className="text-xs" style={{ color: '#8b949e' }}>Más</span>
      </div>
    </div>
  )
}

export default FrequencyCalendar
