/**
 * Calcula estadísticas de una medida corporal
 * @param {Array} records - Array de registros (ordenados por fecha DESC)
 * @returns {{current: number, min: number, max: number, change: number} | null}
 */
export function calculateMeasurementStats(records) {
  if (!records || records.length === 0) return null

  const values = records.map(r => r.value)
  const current = values[0]
  const oldest = values[values.length - 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const change = Math.round((current - oldest) * 10) / 10

  return { current, min, max, change }
}

/**
 * Transforma registros de medidas a datos para gráfico
 * @param {Array} records - Array de registros (ordenados por fecha DESC)
 * @param {number} limit - Número máximo de registros a incluir
 * @returns {Array<{date: string, value: number, fullDate: string}>}
 */
export function transformMeasurementToChartData(records, limit = 30) {
  if (!records || records.length === 0) return []

  return records
    .slice(0, limit)
    .map(record => {
      const date = new Date(record.recorded_at)
      return {
        date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        value: record.value,
        fullDate: date.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
      }
    })
    .reverse()
}

/**
 * Calcula la tendencia de una medida (subiendo, bajando, estable)
 * @param {Array} records - Array de registros (ordenados por fecha DESC)
 * @param {number} days - Número de días para comparar
 * @returns {'increasing' | 'decreasing' | 'stable'}
 */
export function calculateMeasurementTrend(records, days = 7) {
  if (!records || records.length < 2) return 'stable'

  const recentRecords = records.slice(0, days)
  const previousRecords = records.slice(days, days * 2)

  if (previousRecords.length === 0) {
    const first = records[records.length - 1].value
    const last = records[0].value
    const diff = last - first
    if (Math.abs(diff) < 0.5) return 'stable'
    return diff > 0 ? 'increasing' : 'decreasing'
  }

  const recentAvg = recentRecords.reduce((sum, r) => sum + r.value, 0) / recentRecords.length
  const prevAvg = previousRecords.reduce((sum, r) => sum + r.value, 0) / previousRecords.length

  const diff = recentAvg - prevAvg
  if (Math.abs(diff) < 0.5) return 'stable'
  return diff > 0 ? 'increasing' : 'decreasing'
}
