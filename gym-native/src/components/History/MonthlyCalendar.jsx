import { useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { generateCalendarDays, getMonthName, getPreviousMonth, getNextMonth } from '../../lib/calendarUtils'
import { MUSCLE_GROUP_COLORS } from '../../lib/constants'
import { colors } from '../../lib/styles'

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function MonthlyCalendar({ sessions, onDayPress, currentDate, onDateChange }) {
  const calendarData = useMemo(
    () => generateCalendarDays(currentDate, sessions),
    [currentDate, sessions],
  )

  const monthName = getMonthName(currentDate)

  return (
    <View className="rounded-lg p-4" style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => onDateChange(getPreviousMonth(currentDate))}
          className="p-2 rounded"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <ChevronLeft size={18} color={colors.textSecondary} />
        </Pressable>

        <View className="flex-row items-center gap-3">
          <Text className="text-lg font-medium capitalize" style={{ color: colors.textPrimary }}>
            {monthName}
          </Text>
          <Pressable
            onPress={() => onDateChange(new Date())}
            className="px-2 py-1 rounded"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <Text className="text-xs" style={{ color: colors.textSecondary }}>Hoy</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => onDateChange(getNextMonth(currentDate))}
          className="p-2 rounded"
          style={{ backgroundColor: colors.bgTertiary }}
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

          const hasWorkout = dayData.sessions.length > 0

          return (
            <Pressable
              key={dayData.dateKey}
              onPress={() => hasWorkout && onDayPress?.(dayData)}
              style={{
                width: '14.28%',
                aspectRatio: 1,
                padding: 2,
              }}
            >
              <View
                className="flex-1 rounded p-1"
                style={{
                  backgroundColor: dayData.isToday ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
                  borderWidth: dayData.isToday ? 1 : 0,
                  borderColor: dayData.isToday ? colors.accent : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: dayData.isToday ? colors.accent : colors.textSecondary }}
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

      <View className="mt-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(MUSCLE_GROUP_COLORS).map(([name, color]) => (
            <View key={name} className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <Text className="text-xs" style={{ color: colors.textSecondary }}>{name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
