import { getPendingReminders } from '../lib/reminderUtils.js'
import { useLatestBodyWeight } from './useBodyWeight.js'
import { useLatestBodyMeasurement } from './useBodyMeasurements.js'
import { usePreferences } from './usePreferences.js'

export function usePendingReminders() {
  const { data: latestWeight } = useLatestBodyWeight()
  const { data: latestMeasurement } = useLatestBodyMeasurement()
  const { data: prefs } = usePreferences()

  return getPendingReminders({
    latestWeightDate: latestWeight?.recorded_at ?? null,
    latestMeasurementsDate: latestMeasurement?.recorded_at ?? null,
    weightThresholdDays: prefs?.body_weight_reminder_days,
    measurementsThresholdDays: prefs?.body_measurements_reminder_days,
  })
}
