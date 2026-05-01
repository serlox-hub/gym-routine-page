import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_RANGES, MeasurementType, filterRecordsByRange, transformSessionsToChartData } from '@gym/shared'
import { ChartRangeToggle } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

const TABS = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  E1RM: 'e1rm',
}

function ExerciseProgressChart({ sessions, measurementType, weightUnit = 'kg' }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(TABS.WEIGHT)
  const [range, setRange] = useState(CHART_RANGES.ONE_MONTH)
  const showVolumeTabs = measurementType === MeasurementType.WEIGHT_REPS

  const TAB_CONFIG = {
    [TABS.WEIGHT]: { dataKey: 'best', color: colors.success, label: t('workout:summary.maxWeight') },
    [TABS.VOLUME]: { dataKey: 'volume', color: colors.success, label: t('workout:summary.totalVolume') },
    [TABS.E1RM]: { dataKey: 'e1rm', color: colors.purple, label: t('workout:summary.best1rm') },
  }

  const filteredSessions = useMemo(
    () => filterRecordsByRange(sessions, range, 'date'),
    [sessions, range]
  )

  const chartData = useMemo(
    () => transformSessionsToChartData(filteredSessions, measurementType, { weightUnit }),
    [filteredSessions, measurementType, weightUnit]
  )

  if (!sessions || sessions.length < 2) {
    return null
  }

  const { dataKey, color: lineColor, label } = TAB_CONFIG[activeTab]

  const header = (
    <div className="flex items-center justify-between mb-3 gap-2">
      {showVolumeTabs ? (
        <div className="flex gap-2">
          {Object.entries(TAB_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: activeTab === key ? `${config.color}20` : colors.bgTertiary,
                color: activeTab === key ? config.color : colors.textSecondary,
              }}
            >
              {config.label}
            </button>
          ))}
        </div>
      ) : (
        <h4 className="text-xs font-medium" style={{ color: colors.textSecondary }}>
          {t('exercise:progression')}
        </h4>
      )}
      <ChartRangeToggle value={range} onChange={setRange} />
    </div>
  )

  if (chartData.length < 2) {
    return (
      <div className="mb-4">
        {header}
        <p className="text-center py-8 text-xs" style={{ color: colors.textMuted }}>
          {t('common:chartRange.noData')}
        </p>
      </div>
    )
  }

  return (
    <div className="mb-4">
      {header}
      <div style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: colors.textSecondary }}
              stroke={colors.border}
            />
            <YAxis
              tick={{ fontSize: 10, fill: colors.textSecondary }}
              stroke={colors.border}
              domain={['dataMin', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: colors.textPrimary }}
              formatter={(value) => {
                if (activeTab === TABS.WEIGHT || activeTab === TABS.E1RM) {
                  return [`${value} ${chartData[0]?.unit || ''}`, label]
                }
                return [`${value}`, label]
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={2}
              dot={{ fill: lineColor, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ExerciseProgressChart
