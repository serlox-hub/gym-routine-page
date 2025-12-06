import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { transformSessionsToDurationChartData, calculateAverageDuration } from '../../lib/workoutCalculations.js'

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
          style={{ backgroundColor: '#21262d', border: '1px solid #30363d' }}
        >
          <div style={{ color: '#e6edf3' }}>{data.dayName}</div>
          <div style={{ color: '#8b949e' }}>{data.fullDate}</div>
          <div style={{ color: '#3fb950' }}>{data.duration} min</div>
        </div>
      )
    }
    return null
  }

  return (
    <div
      className="rounded-lg p-4 mt-4"
      style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: '#e6edf3' }}>
          Duración de sesiones
        </h3>
        <span className="text-xs" style={{ color: '#8b949e' }}>
          Promedio: {avgDuration} min
        </span>
      </div>

      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: '#8b949e', fontSize: 10 }}
              axisLine={{ stroke: '#30363d' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#8b949e', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(88, 166, 255, 0.1)' }} />
            <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.duration >= avgDuration ? '#3fb950' : '#58a6ff'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded" style={{ backgroundColor: '#3fb950' }} />
          <span className="text-xs" style={{ color: '#8b949e' }}>≥ promedio</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded" style={{ backgroundColor: '#58a6ff' }} />
          <span className="text-xs" style={{ color: '#8b949e' }}>{'<'} promedio</span>
        </div>
      </div>
    </div>
  )
}

export default DurationChart
