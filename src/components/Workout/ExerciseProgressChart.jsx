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
import { transformSessionsToChartData } from '../../lib/workoutCalculations.js'

const TABS = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  E1RM: 'e1rm',
}

function ExerciseProgressChart({ sessions, measurementType }) {
  const [activeTab, setActiveTab] = useState(TABS.WEIGHT)
  const showVolumeTabs = measurementType === 'weight_reps'

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
        return { dataKey: 'volume', color: '#3fb950', label: 'Volumen' }
      case TABS.E1RM:
        return { dataKey: 'e1rm', color: '#a371f7', label: '1RM Est.' }
      default:
        return { dataKey: 'best', color: '#58a6ff', label: 'Peso máx' }
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
              backgroundColor: activeTab === TABS.WEIGHT ? 'rgba(88, 166, 255, 0.15)' : '#21262d',
              color: activeTab === TABS.WEIGHT ? '#58a6ff' : '#8b949e',
            }}
          >
            Peso máx
          </button>
          <button
            onClick={() => setActiveTab(TABS.VOLUME)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeTab === TABS.VOLUME ? 'rgba(63, 185, 80, 0.15)' : '#21262d',
              color: activeTab === TABS.VOLUME ? '#3fb950' : '#8b949e',
            }}
          >
            Volumen
          </button>
          <button
            onClick={() => setActiveTab(TABS.E1RM)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeTab === TABS.E1RM ? 'rgba(163, 113, 247, 0.15)' : '#21262d',
              color: activeTab === TABS.E1RM ? '#a371f7' : '#8b949e',
            }}
          >
            1RM Est.
          </button>
        </div>
      ) : (
        <h4 className="text-xs font-medium mb-2" style={{ color: '#8b949e' }}>
          Progresión
        </h4>
      )}

      <div style={{ height: 150 }}>
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#e6edf3' }}
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
