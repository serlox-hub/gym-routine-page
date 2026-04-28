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
import { CHART_RANGES, filterRecordsByRange, getMeasurementLabel, transformMeasurementToChartData } from '@gym/shared'
import { ChartRangeToggle } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function MeasurementChart({ records, measurementType, unit = 'cm' }) {
  const { t } = useTranslation()
  const [range, setRange] = useState(CHART_RANGES.ONE_MONTH)
  const filteredRecords = useMemo(
    () => filterRecordsByRange(records, range),
    [records, range]
  )
  const chartData = useMemo(
    () => transformMeasurementToChartData(filteredRecords, 30),
    [filteredRecords]
  )

  if (!records || records.length < 2) return null

  const label = getMeasurementLabel(measurementType)

  const header = (
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-xs font-medium" style={{ color: colors.textSecondary }}>
        {t('body:measurements.chartTitle')}
      </h4>
      <ChartRangeToggle value={range} onChange={setRange} />
    </div>
  )

  if (chartData.length < 2) {
    return (
      <div>
        {header}
        <p className="text-center py-8 text-xs" style={{ color: colors.textMuted }}>
          {t('common:chartRange.noData')}
        </p>
      </div>
    )
  }

  return (
    <div>
      {header}
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
              formatter={(value) => [`${value} ${unit}`, label]}
            />
            <Line
              type="monotone"
              dataKey="value"
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

export default MeasurementChart
