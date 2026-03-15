import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { LineChart } from 'react-native-gifted-charts'
import { getMeasurementLabel, transformMeasurementToChartData } from '@gym/shared'
import { colors } from '../../lib/styles'

export default function MeasurementChart({ records, measurementType, unit = 'cm' }) {
  const chartData = useMemo(
    () => transformMeasurementToChartData(records, 30),
    [records]
  )

  if (chartData.length < 2) return null

  const label = getMeasurementLabel(measurementType)
  const lineData = chartData.map(d => ({
    value: d.value,
    label: d.date,
  }))

  const values = lineData.map(d => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const yPadding = Math.max(Math.round((maxVal - minVal) * 0.2), 1)

  return (
    <View>
      <Text className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
        Evolución
      </Text>
      <View style={{ marginLeft: -10 }}>
        <LineChart
          data={lineData}
          height={160}
          width={280}
          adjustToWidth
          color={colors.purple}
          dataPointsColor={colors.purple}
          dataPointsRadius={3}
          thickness={2}
          curved
          areaChart
          startFillColor={`${colors.purple}30`}
          endFillColor={`${colors.purple}05`}
          startOpacity={0.3}
          endOpacity={0}
          yAxisColor="transparent"
          xAxisColor={colors.border}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          hideRules
          yAxisOffset={Math.max(minVal - yPadding, 0)}
          noOfSections={4}
          spacing={chartData.length > 15 ? 25 : 40}
          initialSpacing={10}
          endSpacing={10}
          pointerConfig={{
            pointerStripColor: colors.border,
            pointerStripWidth: 1,
            pointerColor: colors.purple,
            radius: 5,
            pointerLabelWidth: 100,
            pointerLabelHeight: 40,
            pointerLabelComponent: (items) => (
              <View
                className="rounded px-2 py-1"
                style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.purple }}>
                  {items[0].value} {unit}
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  {label}
                </Text>
              </View>
            ),
          }}
        />
      </View>
    </View>
  )
}
