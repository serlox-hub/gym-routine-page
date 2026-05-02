import { useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import {
  MUSCLE_GROUP_COLORS,
  generateCalendarDays,
  getMonthName,
  getNextMonth,
  getPreviousMonth,
  usePreference
} from '@gym/shared'
import { colors } from '../../lib/styles'

export default function MonthlyCalendar({ sessions, onDayPress, currentDate, onDateChange, selectedDateKey }) {
  const { t } = useTranslation()
  const { value: weekStartDay } = usePreference('week_start_day')
  const wsd = weekStartDay || 'monday'
  const allDays = t('common:daysShort', { returnObjects: true })
  const DAYS_OF_WEEK = wsd === 'sunday' ? [allDays[6], ...allDays.slice(0, 6)] : allDays
  const calendarData = useMemo(
    () => generateCalendarDays(currentDate, sessions, wsd),
    [currentDate, sessions, wsd],
  )

  const monthName = getMonthName(currentDate)

  return (
    <View className="rounded-lg p-4" style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => onDateChange(getPreviousMonth(currentDate))}
          className="p-2 rounded active:opacity-70"
        >
          <ChevronLeft size={18} color={colors.textSecondary} />
        </Pressable>

        <View className="flex-row items-center gap-3">
          <Text className="text-lg font-medium capitalize" style={{ color: colors.textPrimary }}>
            {monthName}
          </Text>
          <Pressable
            onPress={() => onDateChange(new Date())}
            className="px-2 py-1 rounded active:opacity-70"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('common:time.today')}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => onDateChange(getNextMonth(currentDate))}
          className="p-2 rounded active:opacity-70"
        >
          <ChevronRight size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View className="flex-row mb-2">
        {DAYS_OF_WEEK.map(day => (
          <View key={day} className="flex-1 items-center py-1">
            <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>{day}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {calendarData.map((dayData, index) => {
          if (!dayData) {
            return <View key={`empty-${index}`} style={{ width: '14.28%', aspectRatio: 1 }} />
          }

          const isSelected = selectedDateKey === dayData.dateKey

          return (
            <Pressable
              key={dayData.dateKey}
              onPress={() => onDayPress?.(dayData)}
              style={{
                width: '14.28%',
                aspectRatio: 1,
                padding: 2,
              }}
            >
              <View
                className="flex-1 rounded p-1"
                style={{
                  backgroundColor: isSelected ? colors.successBg : colors.bgTertiary,
                  borderWidth: isSelected || dayData.isToday ? 1 : 0,
                  borderColor: isSelected ? colors.success : dayData.isToday ? colors.textMuted : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: isSelected ? colors.success : dayData.isToday ? colors.textPrimary : colors.textSecondary }}
                >
                  {dayData.day}
                </Text>

                {dayData.muscleGroups.length > 0 && (
                  <View className="flex-row flex-wrap gap-0.5 mt-auto">
                    {dayData.muscleGroups.slice(0, 4).map(mg => (
                      <View
                        key={mg}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: MUSCLE_GROUP_COLORS[mg] || colors.textSecondary }}
                      />
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          )
        })}
      </View>

    </View>
  )
}
