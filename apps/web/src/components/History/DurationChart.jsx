import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { calculateAverageDuration, transformSessionsToDurationChartData } from '@gym/shared'
import { colors } from '../../lib/styles.js'

function DurationChart({ sessions, currentDate }) {
  const chartData = useMemo(() => {
    if (!sessions) return []
    return transformSessionsToDurationChartData(sessions, currentDate)
  }, [sessions, currentDate])

  if (chartData.length === 0) {
    return null
  }

  const avgDuration = calculateAverageDuration(chartData)

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          className="rounded px-2 py-1 text-xs"
          style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
        >
          <div style={{ color: colors.textPrimary }}>{data.dayName}</div>
          <div style={{ color: colors.textSecondary }}>{data.fullDate}</div>
          <div style={{ color: colors.success }}>{data.duration} min</div>
        </div>
      )
    }
    return null
  }

  return (
    <div
      className="rounded-lg p-4 mt-4"
      style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: colors.textPrimary }}>
          Duración de sesiones
        </h3>
        <span className="text-xs" style={{ color: colors.textSecondary }}>
          Promedio: {avgDuration} min
        </span>
      </div>

      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: colors.textSecondary, fontSize: 10 }}
              axisLine={{ stroke: colors.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: colors.textSecondary, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(88, 166, 255, 0.1)' }} />
            <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.duration >= avgDuration ? colors.success : colors.accent}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded" style={{ backgroundColor: colors.success }} />
          <span className="text-xs" style={{ color: colors.textSecondary }}>≥ promedio</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded" style={{ backgroundColor: colors.accent }} />
          <span className="text-xs" style={{ color: colors.textSecondary }}>{'<'} promedio</span>
        </div>
      </div>
    </div>
  )
}

export default DurationChart
