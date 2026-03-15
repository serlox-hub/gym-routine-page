import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { BarChart } from 'react-native-gifted-charts'
import { calculateAverageDuration, transformSessionsToDurationChartData } from '@gym/shared'
import { colors } from '../../lib/styles'

export default function DurationChart({ sessions, currentDate }) {
  const chartData = useMemo(() => {
    if (!sessions) return []
    return transformSessionsToDurationChartData(sessions, currentDate)
  }, [sessions, currentDate])

  if (chartData.length === 0) return null

  const avgDuration = calculateAverageDuration(chartData)

  const barData = chartData.map(d => ({
    value: d.duration,
    label: String(d.date),
    frontColor: d.duration >= avgDuration ? colors.success : colors.accent,
    topLabelComponent: undefined,
  }))

  return (
    <View
      className="rounded-lg p-4 mt-4"
      style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-medium text-primary">Duración de sesiones</Text>
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          Promedio: {avgDuration} min
        </Text>
      </View>

      <View style={{ marginLeft: -10 }}>
        <BarChart
          data={barData}
          height={100}
          width={280}
          adjustToWidth
          barWidth={chartData.length > 15 ? 12 : 20}
          spacing={chartData.length > 15 ? 8 : 15}
          initialSpacing={10}
          endSpacing={10}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          yAxisColor="transparent"
          xAxisColor={colors.border}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          hideRules
          noOfSections={3}
        />
      </View>

      <View className="flex-row items-center justify-center gap-4 mt-2">
        <View className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded" style={{ backgroundColor: colors.success }} />
          <Text className="text-xs" style={{ color: colors.textSecondary }}>{'≥'} promedio</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded" style={{ backgroundColor: colors.accent }} />
          <Text className="text-xs" style={{ color: colors.textSecondary }}>{'<'} promedio</Text>
        </View>
      </View>
    </View>
  )
}
