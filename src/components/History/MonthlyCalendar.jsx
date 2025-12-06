import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { generateCalendarDays, getMonthName, getPreviousMonth, getNextMonth } from '../../lib/calendarUtils.js'

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MUSCLE_GROUP_COLORS = {
  'Pecho': '#f85149',
  'Espalda': '#58a6ff',
  'Hombros': '#a371f7',
  'Bíceps': '#d29922',
  'Tríceps': '#f0883e',
  'Piernas': '#3fb950',
  'Core': '#88c6be',
  'Glúteos': '#db61a2',
  'Antebrazos': '#8b949e',
}

function MonthlyCalendar({ sessions, onDayClick, currentDate, onDateChange }) {
  const calendarData = useMemo(
    () => generateCalendarDays(currentDate, sessions),
    [currentDate, sessions]
  )

  const monthName = getMonthName(currentDate)

  const goToPrevMonth = () => onDateChange(getPreviousMonth(currentDate))
  const goToNextMonth = () => onDateChange(getNextMonth(currentDate))
  const goToToday = () => onDateChange(new Date())

  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
      {/* Header con navegación */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded hover:opacity-80"
          style={{ backgroundColor: '#21262d' }}
        >
          <ChevronLeft size={18} style={{ color: '#8b949e' }} />
        </button>

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium capitalize" style={{ color: '#e6edf3' }}>
            {monthName}
          </h3>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded hover:opacity-80"
            style={{ backgroundColor: '#21262d', color: '#8b949e' }}
          >
            Hoy
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="p-2 rounded hover:opacity-80"
          style={{ backgroundColor: '#21262d' }}
        >
          <ChevronRight size={18} style={{ color: '#8b949e' }} />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium py-1"
            style={{ color: '#8b949e' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid del calendario */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((dayData, index) => {
          if (!dayData) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const hasWorkout = dayData.sessions.length > 0

          return (
            <div
              key={dayData.dateKey}
              onClick={() => hasWorkout && onDayClick?.(dayData)}
              className={`aspect-square rounded p-1 flex flex-col ${hasWorkout ? 'cursor-pointer hover:opacity-80' : ''}`}
              style={{
                backgroundColor: dayData.isToday ? 'rgba(88, 166, 255, 0.15)' : '#21262d',
                border: dayData.isToday ? '1px solid #58a6ff' : '1px solid transparent',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: dayData.isToday ? '#58a6ff' : '#8b949e' }}
              >
                {dayData.day}
              </span>

              {/* Indicadores de grupos musculares */}
              {dayData.muscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-auto">
                  {dayData.muscleGroups.slice(0, 4).map(mg => (
                    <div
                      key={mg}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: MUSCLE_GROUP_COLORS[mg] || '#8b949e' }}
                      title={mg}
                    />
                  ))}
                  {dayData.muscleGroups.length > 4 && (
                    <span className="text-xs" style={{ color: '#8b949e', fontSize: 8 }}>
                      +{dayData.muscleGroups.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid #30363d' }}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MUSCLE_GROUP_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs" style={{ color: '#8b949e' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MonthlyCalendar
