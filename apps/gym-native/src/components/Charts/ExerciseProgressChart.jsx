import { useState, useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LineChart } from 'react-native-gifted-charts'
import { MeasurementType, transformSessionsToChartData } from '@gym/shared'
import { colors } from '../../lib/styles'

const TABS = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  E1RM: 'e1rm',
}

export default function ExerciseProgressChart({ sessions, measurementType }) {
  const { t } = useTranslation()

  const TAB_CONFIG = {
    [TABS.WEIGHT]: { dataKey: 'best', color: colors.accent, label: t('workout:summary.maxWeight') },
    [TABS.VOLUME]: { dataKey: 'volume', color: colors.success, label: t('workout:summary.totalVolume') },
    [TABS.E1RM]: { dataKey: 'e1rm', color: colors.purple, label: t('workout:summary.best1RM') },
  }
  const [activeTab, setActiveTab] = useState(TABS.WEIGHT)
  const showVolumeTabs = measurementType === MeasurementType.WEIGHT_REPS

  const chartData = useMemo(
    () => transformSessionsToChartData(sessions, measurementType),
    [sessions, measurementType]
  )

  const { dataKey, color, label } = TAB_CONFIG[activeTab]
  const lineData = chartData.map(d => ({
    value: d[dataKey] || 0,
    label: d.date,
    dataPointText: undefined,
  }))

  if (lineData.length < 2) return null

  const values = lineData.map(d => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const yPadding = Math.max(Math.round((maxVal - minVal) * 0.15), 1)

  return (
    <View>
      {showVolumeTabs ? (
        <View className="flex-row gap-2 mb-3">
          {Object.entries(TAB_CONFIG).map(([key, config]) => (
            <Pressable
              key={key}
              onPress={() => setActiveTab(key)}
              className="px-3 py-1.5 rounded active:opacity-70"
              style={{
                backgroundColor: activeTab === key
                  ? `${config.color}25`
                  : colors.bgTertiary,
              }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: activeTab === key ? config.color : colors.textSecondary }}
              >
                {config.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
          Progresión
        </Text>
      )}

      <View style={{ marginLeft: -10 }}>
        <LineChart
          data={lineData}
          height={140}
          width={280}
          adjustToWidth
          color={color}
          dataPointsColor={color}
          dataPointsRadius={3}
          thickness={2}
          curved
          areaChart
          startFillColor={`${color}30`}
          endFillColor={`${color}05`}
          startOpacity={0.3}
          endOpacity={0}
          yAxisColor="transparent"
          xAxisColor={colors.border}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          hideRules
          yAxisOffset={Math.max(minVal - yPadding, 0)}
          noOfSections={4}
          spacing={chartData.length > 10 ? 30 : 40}
          initialSpacing={10}
          endSpacing={10}
          pointerConfig={{
            pointerStripColor: colors.border,
            pointerStripWidth: 1,
            pointerColor: color,
            radius: 5,
            pointerLabelWidth: 100,
            pointerLabelHeight: 40,
            pointerLabelComponent: (items) => (
              <View
                className="rounded px-2 py-1"
                style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
              >
                <Text className="text-xs font-bold" style={{ color }}>
                  {items[0].value} {chartData[0]?.unit || ''}
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
