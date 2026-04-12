import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LineChart } from 'react-native-gifted-charts'
import { transformMeasurementToChartData } from '@gym/shared'
import { colors } from '../../lib/styles'

export default function MeasurementChart({ records, unit = 'cm' }) {
  const { t } = useTranslation()
  const chartData = useMemo(
    () => transformMeasurementToChartData(records, 30),
    [records]
  )

  if (chartData.length < 2) return null

  const lineData = chartData.map((d, i) => ({
    value: d.value,
    label: d.date,
    index: i,
  }))

  const values = lineData.map(d => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const yPadding = Math.max(Math.round((maxVal - minVal) * 0.2), 1)

  return (
    <View>
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 8 }}>
        {t('body:measurements.chartTitle')}
      </Text>
      <View style={{ marginLeft: -10 }}>
        <LineChart
          data={lineData}
          height={160}
          width={280}
          adjustToWidth
          color={colors.success}
          dataPointsColor={colors.success}
          dataPointsRadius={3}
          thickness={2}
          curved
          yAxisColor="transparent"
          xAxisColor={colors.border}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          rulesColor={colors.border}
          rulesType="dashed"
          dashWidth={4}
          dashGap={4}
          yAxisOffset={Math.max(minVal - yPadding, 0)}
          noOfSections={4}
          spacing={chartData.length > 15 ? 25 : 40}
          initialSpacing={10}
          endSpacing={10}
          pointerConfig={{
            pointerStripColor: colors.border,
            pointerStripWidth: 1,
            pointerColor: colors.success,
            radius: 5,
            shiftPointerLabelX: -50,
            pointerLabelWidth: 100,
            pointerLabelHeight: 44,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items) => {
              const idx = items[0]?.index ?? lineData.findIndex(d => d.value === items[0]?.value)
              const fullDate = chartData[idx]?.fullDate || ''
              return (
                <View style={{ backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>
                    {items[0].value} {unit}
                  </Text>
                  {fullDate ? (
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{fullDate}</Text>
                  ) : null}
                </View>
              )
            },
          }}
        />
      </View>
    </View>
  )
}
