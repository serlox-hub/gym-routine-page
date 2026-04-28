import { useMemo, useState } from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LineChart } from 'react-native-gifted-charts'
import { CHART_RANGES, filterRecordsByRange, transformBodyWeightToChartData } from '@gym/shared'
import ChartRangeToggle from './ChartRangeToggle.jsx'
import { colors } from '../../lib/styles'

export default function BodyWeightChart({ records, unit = 'kg' }) {
  const { t } = useTranslation()
  const [chartWidth, setChartWidth] = useState(0)
  const [range, setRange] = useState(CHART_RANGES.ONE_MONTH)
  const filteredRecords = useMemo(
    () => filterRecordsByRange(records, range),
    [records, range]
  )
  const chartData = useMemo(
    () => transformBodyWeightToChartData(filteredRecords, 30),
    [filteredRecords]
  )

  if (!records || records.length < 2) return null

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>
        {t('body:weight.chartTitle')}
      </Text>
      <ChartRangeToggle value={range} onChange={setRange} />
    </View>
  )

  if (chartData.length < 2) {
    return (
      <View>
        {header}
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 32 }}>
          {t('body:chartRange.noData')}
        </Text>
      </View>
    )
  }

  const lineData = chartData.map((d, i) => ({
    value: d.weight,
    label: d.date,
    dataPointLabelComponent: () => null,
    index: i,
  }))

  const values = lineData.map(d => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const yPadding = Math.max(Math.round((maxVal - minVal) * 0.2), 1)

  return (
    <View>
      {header}
      <View onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
        {chartWidth > 0 && (
        <LineChart
          data={lineData}
          height={160}
          width={chartWidth}
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
          endSpacing={20}
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
        )}
      </View>
    </View>
  )
}
