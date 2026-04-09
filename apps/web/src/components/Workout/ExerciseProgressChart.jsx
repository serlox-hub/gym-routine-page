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
import { MeasurementType, transformSessionsToChartData } from '@gym/shared'
import { colors } from '../../lib/styles.js'

const TABS = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  E1RM: 'e1rm',
}

function ExerciseProgressChart({ sessions, chartData: chartDataProp, measurementType, weightUnit = 'kg' }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(TABS.WEIGHT)
  const showVolumeTabs = measurementType === MeasurementType.WEIGHT_REPS

  const TAB_CONFIG = {
    [TABS.WEIGHT]: { dataKey: 'best', color: colors.accent, label: t('workout:summary.maxWeight') },
    [TABS.VOLUME]: { dataKey: 'volume', color: colors.success, label: t('workout:summary.totalVolume') },
    [TABS.E1RM]: { dataKey: 'e1rm', color: colors.purple, label: t('workout:summary.best1rm') },
  }

  const chartData = useMemo(
    () => chartDataProp || transformSessionsToChartData(sessions, measurementType, { weightUnit }),
    [chartDataProp, sessions, measurementType, weightUnit]
  )

  if (chartData.length < 2) {
    return null
  }

  const { dataKey, color: lineColor, label } = TAB_CONFIG[activeTab]

  return (
    <div className="mb-4">
      {showVolumeTabs ? (
        <div className="flex gap-2 mb-3">
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
        <h4 className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
          {t('exercise:progression')}
        </h4>
      )}

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
