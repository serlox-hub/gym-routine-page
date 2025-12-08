import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { transformBodyWeightToChartData } from '../../lib/bodyWeightCalculations.js'

function BodyWeightChart({ records, unit = 'kg' }) {
  const chartData = useMemo(
    () => transformBodyWeightToChartData(records, 30),
    [records]
  )

  if (chartData.length < 2) {
    return null
  }

  return (
    <div>
      <h4 className="text-xs font-medium mb-2" style={{ color: '#8b949e' }}>
        Evolución
      </h4>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#8b949e' }}
              stroke="#30363d"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#8b949e' }}
              stroke="#30363d"
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#e6edf3' }}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
              formatter={(value) => [`${value} ${unit}`, 'Peso']}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#58a6ff"
              strokeWidth={2}
              dot={{ fill: '#58a6ff', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default BodyWeightChart
