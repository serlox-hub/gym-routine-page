import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  MUSCLE_GROUP_COLORS,
  generateCalendarDays,
  getMonthName,
  getNextMonth,
  getPreviousMonth,
  usePreference
} from '@gym/shared'
import { colors } from '../../lib/styles.js'
import { IconButton } from '../ui/index.js'

function MonthlyCalendar({ sessions, onDayClick, currentDate, onDateChange, selectedDateKey }) {
  const { t } = useTranslation()
  const { value: weekStartDay } = usePreference('week_start_day')
  const wsd = weekStartDay || 'monday'
  const allDays = t('common:daysShort', { returnObjects: true })
  const DAYS_OF_WEEK = wsd === 'sunday' ? [allDays[6], ...allDays.slice(0, 6)] : allDays
  const calendarData = useMemo(
    () => generateCalendarDays(currentDate, sessions, wsd),
    [currentDate, sessions, wsd]
  )

  const monthName = getMonthName(currentDate)

  const goToPrevMonth = () => onDateChange(getPreviousMonth(currentDate))
  const goToNextMonth = () => onDateChange(getNextMonth(currentDate))
  const goToToday = () => onDateChange(new Date())

  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
      {/* Header con navegación */}
      {/* mb-3, not mb-4: the 44px boxes already add 5px under the old 34px header. -mx-1.5 gives
          back 12px of the 20 the arrows grew, inside the card's p-4: at 360px a long month
          ("Septiembre De 2026") plus «Hoy» did not fit between them. */}
      <div className="flex items-center justify-between mb-3 -mx-1.5">
        <IconButton icon={ChevronLeft} label={t('workout:history.previousMonth')} onClick={goToPrevMonth} />

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium capitalize" style={{ color: colors.textPrimary }}>
            {monthName}
          </h3>
          <button onClick={goToToday} className="min-h-11 flex items-center hover:opacity-80">
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
            >
              {t('common:time.today')}
            </span>
          </button>
        </div>

        <IconButton icon={ChevronRight} label={t('workout:history.nextMonth')} onClick={goToNextMonth} />
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
            return <div key={`empty-${index}`} className="aspect-square min-h-11" />
          }

          const isSelected = selectedDateKey === dayData.dateKey

          return (
            <div
              key={dayData.dateKey}
              onClick={() => onDayClick?.(dayData)}
              className="aspect-square min-h-11 rounded p-1 flex flex-col cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: isSelected ? colors.successBg : colors.bgTertiary,
                border: isSelected ? `1px solid ${colors.success}` : dayData.isToday ? `1px solid ${colors.textMuted}` : '1px solid transparent',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: isSelected ? colors.success : dayData.isToday ? colors.textPrimary : colors.textSecondary }}
              >
                {dayData.day}
              </span>

              {/* Indicadores de grupos musculares */}
              {dayData.muscleGroups.length > 0 && (
                <div className="grid grid-cols-4 gap-0.5 md:gap-1 lg:gap-1.5 mt-auto">
                  {dayData.muscleGroups.slice(0, 8).map(mg => (
                    <div
                      key={mg}
                      className="w-1.5 h-1.5 md:w-2 md:h-2 lg:w-2.5 lg:h-2.5 xl:w-3 xl:h-3 rounded-full"
                      style={{ backgroundColor: MUSCLE_GROUP_COLORS[mg] || colors.textSecondary }}
                      title={mg}
                    />
                  ))}
                  {dayData.muscleGroups.length > 8 && (
                    <span className="text-[6px] md:text-[8px] lg:text-[10px] leading-none col-span-4 text-center" style={{ color: colors.textSecondary }}>
                      +{dayData.muscleGroups.length - 8}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}

export default MonthlyCalendar
