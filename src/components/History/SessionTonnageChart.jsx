import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function SessionTonnageChart({ sessions }) {
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return []

    // Tomar las últimas 10 sesiones y ordenar por fecha
    const recentSessions = sessions.slice(0, 10).reverse()

    return recentSessions.map(session => {
      const date = new Date(session.started_at)
      const dateLabel = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

      // Calcular tonelaje total de la sesión
      let totalTonnage = 0
      session.sets?.forEach(set => {
        if (set.weight && set.reps_completed) {
          totalTonnage += set.weight * set.reps_completed
        }
      })

      return {
        date: dateLabel,
        tonnage: Math.round(totalTonnage),
        dayName: session.routine_day?.nombre || 'Sesión',
      }
    })
  }, [sessions])

  if (chartData.length < 2) {
    return null
  }

  return (
    <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: '#e6edf3' }}>
        Tonelaje por sesión
      </h3>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#8b949e' }}
              stroke="#30363d"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#8b949e' }}
              stroke="#30363d"
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#e6edf3' }}
              formatter={(value, name, props) => [
                `${value.toLocaleString()} kg`,
                props.payload.dayName,
              ]}
            />
            <Bar
              dataKey="tonnage"
              fill="#58a6ff"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default SessionTonnageChart
