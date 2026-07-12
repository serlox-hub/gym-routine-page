import { useState, useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LineChart } from 'react-native-gifted-charts'
import { CHART_RANGES, MeasurementType, filterRecordsByRange, transformSessionsToChartData } from '@gym/shared'
import ChartRangeToggle from './ChartRangeToggle.jsx'
import { colors } from '../../lib/styles'

const TABS = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  E1RM: 'e1rm',
}

// Paleta para las líneas por gimnasio en el modo overlay
const GYM_LINE_COLORS = [colors.success, colors.purple, colors.teal, colors.pink, colors.orange, colors.gold]

// Mapea filas de exercise_session_stats (useExerciseChartData) al formato del gráfico
function statRowToPoint(row, weightUnit) {
  return {
    date: new Date(row.session_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    rawDate: row.session_date,
    best: Number(row.best_weight) || 0,
    volume: Math.round(Number(row.total_volume) || 0),
    e1rm: Number(row.best_1rm) || 0,
    unit: weightUnit,
  }
}

export default function ExerciseProgressChart({ sessions, chartRows, overlayGyms, measurementType, weightUnit = 'kg' }) {
  const { t } = useTranslation()
  const [chartWidth, setChartWidth] = useState(0)
  const [activeTab, setActiveTab] = useState(TABS.WEIGHT)
  const [range, setRange] = useState(CHART_RANGES.ONE_MONTH)

  const isOverlay = Array.isArray(overlayGyms) && overlayGyms.length > 0
  const isStatRows = Array.isArray(chartRows)

  const TAB_CONFIG = {
    [TABS.WEIGHT]: { dataKey: 'best', color: colors.success, label: t('workout:summary.maxWeight') },
    [TABS.VOLUME]: { dataKey: 'volume', color: colors.success, label: t('workout:summary.totalVolume') },
    [TABS.E1RM]: { dataKey: 'e1rm', color: colors.success, label: t('workout:summary.best1rm') },
  }
  const showVolumeTabs = measurementType === MeasurementType.WEIGHT_REPS
  const { dataKey, color: lineColor, label } = TAB_CONFIG[activeTab]

  // Datos para modo overlay: una serie por gym
  const overlayData = useMemo(() => {
    if (!isOverlay || !isStatRows) return { series: [] }
    const filtered = filterRecordsByRange(
      [...chartRows].sort((a, b) => new Date(b.session_date) - new Date(a.session_date)),
      range,
      'session_date'
    )
    const presentGymIds = new Set(filtered.map(r => String(r.gym_id)))
    // gifted-charts LineChart admite hasta 5 líneas superpuestas (data..data5)
    const series = overlayGyms
      .filter(g => presentGymIds.has(String(g.id)))
      .slice(0, 5)
      .map((g, i) => {
        const points = filtered
          .filter(r => String(r.gym_id) === String(g.id))
          .map(r => statRowToPoint(r, weightUnit))
          .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
        return {
          id: g.id,
          name: g.name,
          color: GYM_LINE_COLORS[i % GYM_LINE_COLORS.length],
          data: points.map(p => ({ value: p[dataKey] || 0, label: p.date })),
        }
      })
      .filter(s => s.data.length >= 1)
    return { series }
  }, [isOverlay, isStatRows, chartRows, overlayGyms, range, weightUnit, dataKey])

  // Datos para modo single (una línea): filas de stats o sesiones crudas
  const singleData = useMemo(() => {
    if (isOverlay) return []
    if (isStatRows) {
      const filtered = filterRecordsByRange(
        [...chartRows].sort((a, b) => new Date(b.session_date) - new Date(a.session_date)),
        range,
        'session_date'
      )
      return filtered
        .map(row => statRowToPoint(row, weightUnit))
        .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
    }
    const filteredSessions = filterRecordsByRange(sessions, range, 'date')
    return transformSessionsToChartData(filteredSessions, measurementType, { weightUnit })
  }, [isOverlay, isStatRows, chartRows, sessions, range, measurementType, weightUnit])

  const enoughSource = isStatRows ? (chartRows?.length ?? 0) >= 2 : (sessions?.length ?? 0) >= 2
  if (!enoughSource) return null

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
      {showVolumeTabs ? (
        <View className="flex-row gap-2">
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
        <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
          {t('exercise:progression')}
        </Text>
      )}
      <ChartRangeToggle value={range} onChange={setRange} />
    </View>
  )

  // OVERLAY MODE: una línea por gym + leyenda
  if (isOverlay) {
    const series = overlayData.series
    const hasEnough = series.some(s => s.data.length >= 2)
    if (!hasEnough) {
      return (
        <View>
          {header}
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 32 }}>
            {t('common:chartRange.noData')}
          </Text>
        </View>
      )
    }

    const allValues = series.flatMap(s => s.data.map(d => d.value))
    const minVal = Math.min(...allValues)
    const maxVal = Math.max(...allValues)
    const yPadding = Math.max(Math.round((maxVal - minVal) * 0.15), 1)

    // gifted-charts admite data, data2, data3... para líneas superpuestas
    const lineProps = {}
    series.forEach((s, i) => {
      const dataProp = i === 0 ? 'data' : `data${i + 1}`
      const colorProp = i === 0 ? 'color' : `color${i + 1}`
      const dataPointsColorProp = i === 0 ? 'dataPointsColor' : `dataPointsColor${i + 1}`
      lineProps[dataProp] = s.data
      lineProps[colorProp] = s.color
      lineProps[dataPointsColorProp] = s.color
    })

    return (
      <View>
        {header}

        {/* Leyenda por gym */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          {series.map(s => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>{s.name}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginLeft: -10 }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
          {chartWidth > 0 && (
            <LineChart
              {...lineProps}
              height={160}
              width={chartWidth}
              adjustToWidth
              dataPointsRadius={3}
              thickness={2}
              curved
              yAxisColor="transparent"
              xAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
              hideRules
              yAxisOffset={Math.max(minVal - yPadding, 0)}
              noOfSections={4}
              spacing={40}
              initialSpacing={10}
              endSpacing={20}
            />
          )}
        </View>
      </View>
    )
  }

  // SINGLE MODE
  const chartData = singleData
  if (chartData.length < 2) {
    return (
      <View>
        {header}
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 32 }}>
          {t('common:chartRange.noData')}
        </Text>
      </View>
    )
  }

  const lineData = chartData.map(d => ({
    value: d[dataKey] || 0,
    label: d.date,
    dataPointText: undefined,
  }))

  const values = lineData.map(d => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const yPadding = Math.max(Math.round((maxVal - minVal) * 0.15), 1)

  return (
    <View>
      {header}

      <View style={{ marginLeft: -10 }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
        {chartWidth > 0 && (
        <LineChart
          data={lineData}
          height={140}
          width={chartWidth}
          adjustToWidth
          color={lineColor}
          dataPointsColor={lineColor}
          dataPointsRadius={3}
          thickness={2}
          curved
          areaChart
          startFillColor={`${lineColor}30`}
          endFillColor={`${lineColor}05`}
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
          endSpacing={20}
          pointerConfig={{
            pointerStripColor: colors.border,
            pointerStripWidth: 1,
            pointerColor: lineColor,
            radius: 5,
            pointerLabelWidth: 100,
            pointerLabelHeight: 40,
            activatePointersOnLongPress: true,
            activatePointersInstantlyOnTouch: true,
            activatePointersDelay: 150,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items) => (
              <View
                className="rounded px-2 py-1"
                style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
              >
                <Text className="text-xs font-bold" style={{ color: lineColor }}>
                  {items[0].value} {chartData[0]?.unit || ''}
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  {label}
                </Text>
              </View>
            ),
          }}
        />
        )}
      </View>
    </View>
  )
}
