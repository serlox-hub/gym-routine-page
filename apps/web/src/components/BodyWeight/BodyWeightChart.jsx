import { useMemo } from 'react'
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
import { transformBodyWeightToChartData } from '@gym/shared'
import { colors } from '../../lib/styles.js'

function BodyWeightChart({ records, unit = 'kg' }) {
  const { t } = useTranslation()
  const chartData = useMemo(
    () => transformBodyWeightToChartData(records, 30),
    [records]
  )

  if (chartData.length < 2) {
    return null
  }

  return (
    <div>
      <h4 className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
        {t('body:weight.chartTitle')}
      </h4>
      <div style={{ height: 180 }}>
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
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.bgSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: colors.textPrimary }}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
              formatter={(value) => [`${value} ${unit}`, t('body:weight.tab')]}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke={colors.success}
              strokeWidth={2}
              dot={{ fill: colors.success, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default BodyWeightChart
