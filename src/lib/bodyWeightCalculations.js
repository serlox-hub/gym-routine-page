/**
 * Calcula estadísticas de peso corporal
 * @param {Array} records - Array de registros de peso (ordenados por fecha DESC)
 * @returns {{current: number, min: number, max: number, average: number, change: number, changePercent: number} | null}
 */
export function calculateBodyWeightStats(records) {
  if (!records || records.length === 0) return null

  const weights = records.map(r => r.weight)
  const current = weights[0]
  const oldest = weights[weights.length - 1]
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const average = Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10
  const change = Math.round((current - oldest) * 10) / 10
  const changePercent = oldest > 0 ? Math.round((change / oldest) * 1000) / 10 : 0

  return { current, min, max, average, change, changePercent }
}

/**
 * Transforma registros de peso a datos para gráfico
 * @param {Array} records - Array de registros de peso (ordenados por fecha DESC)
 * @param {number} limit - Número máximo de registros a incluir
 * @returns {Array<{date: string, weight: number, fullDate: string}>}
 */
export function transformBodyWeightToChartData(records, limit = 30) {
  if (!records || records.length === 0) return []

  return records
    .slice(0, limit)
    .map(record => {
      const date = new Date(record.recorded_at)
      return {
        date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        weight: record.weight,
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
 * Calcula la tendencia del peso (subiendo, bajando, estable)
 * Compara el promedio de los últimos N días con los N días anteriores
 * @param {Array} records - Array de registros de peso (ordenados por fecha DESC)
 * @param {number} days - Número de días para comparar
 * @returns {'increasing' | 'decreasing' | 'stable'}
 */
export function calculateWeightTrend(records, days = 7) {
  if (!records || records.length < 2) return 'stable'

  const recentRecords = records.slice(0, days)
  const previousRecords = records.slice(days, days * 2)

  if (previousRecords.length === 0) {
    const first = records[records.length - 1].weight
    const last = records[0].weight
    const diff = last - first
    if (Math.abs(diff) < 0.5) return 'stable'
    return diff > 0 ? 'increasing' : 'decreasing'
  }

  const recentAvg = recentRecords.reduce((sum, r) => sum + r.weight, 0) / recentRecords.length
  const prevAvg = previousRecords.reduce((sum, r) => sum + r.weight, 0) / previousRecords.length

  const diff = recentAvg - prevAvg
  if (Math.abs(diff) < 0.5) return 'stable'
  return diff > 0 ? 'increasing' : 'decreasing'
}
