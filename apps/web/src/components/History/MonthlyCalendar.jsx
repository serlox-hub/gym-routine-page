import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { generateCalendarDays, getMonthName, getPreviousMonth, getNextMonth } from '../../lib/calendarUtils.js'
import { MUSCLE_GROUP_COLORS } from '../../lib/constants.js'
import { colors } from '../../lib/styles.js'

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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
    <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
      {/* Header con navegación */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded hover:opacity-80"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <ChevronLeft size={18} style={{ color: colors.textSecondary }} />
        </button>

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium capitalize" style={{ color: colors.textPrimary }}>
            {monthName}
          </h3>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
          >
            Hoy
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="p-2 rounded hover:opacity-80"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <ChevronRight size={18} style={{ color: colors.textSecondary }} />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium py-1"
            style={{ color: colors.textSecondary }}
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
                backgroundColor: dayData.isToday ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
                border: dayData.isToday ? `1px solid ${colors.accent}` : '1px solid transparent',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: dayData.isToday ? colors.accent : colors.textSecondary }}
              >
                {dayData.day}
              </span>

              {/* Indicadores de grupos musculares */}
              {dayData.muscleGroups.length > 0 && (
                <div className="grid grid-cols-4 gap-0.5 mt-auto">
                  {dayData.muscleGroups.slice(0, 8).map(mg => (
                    <div
                      key={mg}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: MUSCLE_GROUP_COLORS[mg] || colors.textSecondary }}
                      title={mg}
                    />
                  ))}
                  {dayData.muscleGroups.length > 8 && (
                    <span className="text-[6px] leading-none col-span-4 text-center" style={{ color: colors.textSecondary }}>
                      +{dayData.muscleGroups.length - 8}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MUSCLE_GROUP_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs" style={{ color: colors.textSecondary }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MonthlyCalendar
