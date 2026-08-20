import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { CHART_RANGES, tracksReps, tracksWeight, filterRecordsByRange, transformSessionsToChartData, convertWeightValue } from '@gym/shared'
import { ChartRangeToggle } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

const TABS = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  E1RM: 'e1rm',
}

// Paleta para las líneas por gimnasio en el modo overlay
const GYM_LINE_COLORS = [colors.success, colors.purple, colors.teal, colors.pink, colors.orange, colors.gold]

// Mapea filas de exercise_session_stats (useExerciseChartData) al formato del gráfico.
// En overlay, cada fila viene en la unidad de su gym (unitByGym) y se convierte a la
// unidad de display común; en modo single, unitByGym es undefined => sin conversión.
function statRowToPoint(row, displayUnit, unitByGym) {
  const srcUnit = unitByGym?.[row.gym_id] || displayUnit
  const conv = (v) => convertWeightValue(Number(v) || 0, srcUnit, displayUnit)
  return {
    date: new Date(row.session_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    rawDate: row.session_date,
    best: conv(row.best_weight),
    volume: Math.round(conv(row.total_volume)),
    e1rm: conv(row.best_1rm),
    unit: displayUnit,
  }
}

function ExerciseProgressChart({ sessions, chartRows, overlayGyms, unitByGym, trackedFields, weightUnit = 'kg' }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(TABS.WEIGHT)
  const [range, setRange] = useState(CHART_RANGES.ONE_MONTH)
  // Volumen y 1RM solo tienen sentido con peso Y reps (ver getTrackableMetrics): son las
  // derivadas del modelo de fuerza, no se calculan para ningún otro ejercicio.
  const showVolumeTabs = tracksWeight(trackedFields) && tracksReps(trackedFields)

  const isOverlay = Array.isArray(overlayGyms) && overlayGyms.length > 0
  const isStatRows = Array.isArray(chartRows)

  const TAB_CONFIG = {
    [TABS.WEIGHT]: { dataKey: 'best', color: colors.success, label: t('workout:summary.maxWeight') },
    [TABS.VOLUME]: { dataKey: 'volume', color: colors.success, label: t('workout:summary.totalVolume') },
    [TABS.E1RM]: { dataKey: 'e1rm', color: colors.success, label: t('workout:summary.best1rm') },
  }
  const { dataKey, color: lineColor, label } = TAB_CONFIG[activeTab]

  // Datos para modo overlay: una serie por gym, mergeadas por fecha
  const overlayData = useMemo(() => {
    if (!isOverlay || !isStatRows) return { data: [], series: [] }
    const filtered = filterRecordsByRange(
      [...chartRows].sort((a, b) => new Date(b.session_date) - new Date(a.session_date)),
      range,
      'session_date'
    )
    const byDate = new Map()
    filtered.forEach(row => {
      const point = statRowToPoint(row, weightUnit, unitByGym)
      const entry = byDate.get(point.date) || { date: point.date, rawDate: point.rawDate }
      entry[`gym_${row.gym_id}`] = point[dataKey]
      byDate.set(point.date, entry)
    })
    const data = Array.from(byDate.values()).sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
    const presentGymIds = new Set(filtered.map(r => String(r.gym_id)))
    const series = overlayGyms
      .filter(g => presentGymIds.has(String(g.id)))
      .map((g, i) => ({
        key: `gym_${g.id}`,
        name: g.name,
        color: GYM_LINE_COLORS[i % GYM_LINE_COLORS.length],
      }))
    return { data, series }
  }, [isOverlay, isStatRows, chartRows, overlayGyms, unitByGym, range, weightUnit, dataKey])

  // Datos para modo single (una línea): filas de stats o sesiones crudas
  const singleData = useMemo(() => {
    if (isOverlay) return []
    if (isStatRows) {
      const filtered = filterRecordsByRange(
        [...chartRows].sort((a, b) => new Date(b.session_date) - new Date(a.session_date)),
        range,
        'session_date'
      )
      return filtered
        .map(row => statRowToPoint(row, weightUnit))
        .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
    }
    const filteredSessions = filterRecordsByRange(sessions, range, 'date')
    return transformSessionsToChartData(filteredSessions, trackedFields, { weightUnit })
  }, [isOverlay, isStatRows, chartRows, sessions, range, trackedFields, weightUnit])

  const chartData = isOverlay ? overlayData.data : singleData
  const enoughSource = isStatRows ? (chartRows?.length ?? 0) >= 2 : (sessions?.length ?? 0) >= 2

  if (!enoughSource) {
    return null
  }

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

  const tooltipFormatter = (value, name) => {
    const seriesLabel = isOverlay ? name : label
    if (!isOverlay && (activeTab === TABS.WEIGHT || activeTab === TABS.E1RM)) {
      return [`${value} ${chartData[0]?.unit || ''}`, seriesLabel]
    }
    if (isOverlay && (activeTab === TABS.WEIGHT || activeTab === TABS.E1RM)) {
      return [`${value} ${weightUnit}`, seriesLabel]
    }
    return [`${value}`, seriesLabel]
  }

  return (
    <div className="mb-4">
      {header}
      {/* Altura como número (no un div padre con height en %): si no, recharts mide -1x-1
          en el primer render y avisa por consola. */}
      <ResponsiveContainer width="100%" height={isOverlay ? 180 : 150}>
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
            formatter={tooltipFormatter}
          />
          {isOverlay ? (
            <>
              <Legend wrapperStyle={{ fontSize: 11, color: colors.textSecondary }} />
              {overlayData.series.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ fill: s.color, r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </>
          ) : (
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={2}
              dot={{ fill: lineColor, r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ExerciseProgressChart
