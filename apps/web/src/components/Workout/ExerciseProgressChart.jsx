import { useMemo, useState } from 'react'
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

function ExerciseProgressChart({ sessions, measurementType }) {
  const [activeTab, setActiveTab] = useState(TABS.WEIGHT)
  const showVolumeTabs = measurementType === MeasurementType.WEIGHT_REPS

  const chartData = useMemo(
    () => transformSessionsToChartData(sessions, measurementType),
    [sessions, measurementType]
  )

  if (chartData.length < 2) {
    return null
  }

  const getChartConfig = () => {
    switch (activeTab) {
      case TABS.VOLUME:
        return { dataKey: 'volume', color: colors.success, label: 'Volumen' }
      case TABS.E1RM:
        return { dataKey: 'e1rm', color: colors.purple, label: '1RM Est.' }
      default:
        return { dataKey: 'best', color: colors.accent, label: 'Peso máx' }
    }
  }

  const { dataKey, color: lineColor, label } = getChartConfig()

  return (
    <div className="mb-4">
      {showVolumeTabs ? (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab(TABS.WEIGHT)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeTab === TABS.WEIGHT ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
              color: activeTab === TABS.WEIGHT ? colors.accent : colors.textSecondary,
            }}
          >
            Peso máx
          </button>
          <button
            onClick={() => setActiveTab(TABS.VOLUME)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeTab === TABS.VOLUME ? colors.successBg : colors.bgTertiary,
              color: activeTab === TABS.VOLUME ? colors.success : colors.textSecondary,
            }}
          >
            Volumen
          </button>
          <button
            onClick={() => setActiveTab(TABS.E1RM)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeTab === TABS.E1RM ? colors.purpleBg : colors.bgTertiary,
              color: activeTab === TABS.E1RM ? colors.purple : colors.textSecondary,
            }}
          >
            1RM Est.
          </button>
        </div>
      ) : (
        <h4 className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
          Progresión
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
