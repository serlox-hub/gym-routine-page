const MS_PER_DAY = 1000 * 60 * 60 * 24

export function getDaysSince(dateStr, now = new Date()) {
  if (!dateStr) return null
  const last = new Date(dateStr)
  if (Number.isNaN(last.getTime())) return null
  const diffMs = now.getTime() - last.getTime()
  if (diffMs < 0) return 0
  return Math.floor(diffMs / MS_PER_DAY)
}

export function getPendingReminders({
  latestWeightDate,
  latestMeasurementsDate,
  weightThresholdDays,
  measurementsThresholdDays,
  now = new Date(),
}) {
  const result = { weight: null, measurements: null }

  const wThreshold = Number(weightThresholdDays) || 0
  if (wThreshold > 0 && latestWeightDate) {
    const days = getDaysSince(latestWeightDate, now)
    if (days !== null && days >= wThreshold) {
      result.weight = { daysSince: days }
    }
  }

  const mThreshold = Number(measurementsThresholdDays) || 0
  if (mThreshold > 0 && latestMeasurementsDate) {
    const days = getDaysSince(latestMeasurementsDate, now)
    if (days !== null && days >= mThreshold) {
      result.measurements = { daysSince: days }
    }
  }

  return result
}
