export const CHART_RANGES = {
  ONE_MONTH: '1m',
  THREE_MONTHS: '3m',
  ALL: 'all',
}

const RANGE_DAYS = {
  [CHART_RANGES.ONE_MONTH]: 30,
  [CHART_RANGES.THREE_MONTHS]: 90,
}

/**
 * Filtra registros por rango temporal.
 * @param {Array} records - Array de registros con campo de fecha (ordenados por fecha DESC)
 * @param {string} range - Uno de CHART_RANGES
 * @param {string} dateField - Nombre del campo de fecha (por defecto 'recorded_at')
 * @returns {Array} Subset de records dentro del rango
 */
export function filterRecordsByRange(records, range, dateField = 'recorded_at') {
  if (!records || records.length === 0) return []
  if (range === CHART_RANGES.ALL) return records

  const days = RANGE_DAYS[range]
  if (!days) return records

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return records.filter(r => {
    const t = new Date(r[dateField]).getTime()
    return Number.isFinite(t) && t >= cutoff
  })
}
