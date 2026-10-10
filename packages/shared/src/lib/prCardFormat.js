import { t } from '../i18n/index.js'
import { formatDuration } from './timeUtils.js'
import { getPRLabel } from './sessionStatsCalculation.js'

// A time record is stored in seconds: painted as a duration ("1:30 min"), never as "90 s".
function formatAmount(detail, value) {
  if (detail.type === 'bestTimeSeconds') return formatDuration(value)
  return `${value} ${detail.unit}`
}

/**
 * The value alone, without the "× N" of a rep record: for a place that already names the reps in
 * its label (formatPRDetailLabel).
 */
export function formatPRDetailAmount(detail) {
  return formatAmount(detail, detail.newValue)
}

/**
 * Qué récord es: "Peso", "1RM", "Récord a 5 reps"...
 */
export function formatPRDetailLabel(detail) {
  if (detail.type === 'repPR') return t('workout:pr.repPR', { repCount: detail.repCount })
  return getPRLabel(detail.type)
}

/**
 * Devuelve el string del valor principal del detalle (formato hero):
 * - repPR: "{weight} kg × {repCount}"
 * - resto: "{newValue} {unit}"
 */
export function formatPRDetailValue(detail) {
  if (detail.type === 'repPR') {
    return `${detail.newValue} ${detail.unit} × ${detail.repCount}`
  }
  return formatAmount(detail, detail.newValue)
}

/**
 * Devuelve el string del valor "anterior" del detalle:
 * - "anterior · 105 kg" si hay oldValue
 * - repPR: "anterior · 20 kg × 8", with the previous set's own reps (oldRepCount), which can be
 *   more than the new record's; details without oldRepCount fall back to repCount
 * - "primera vez a 5 reps" si type=repPR y oldValue=null
 * - null cuando no hay info contextual relevante
 */
export function formatPRDetailPrevious(detail) {
  const previousLabel = t('workout:summary.previousLabel')
  if (detail.oldValue != null) {
    if (detail.type === 'repPR') {
      return `${previousLabel} · ${detail.oldValue} ${detail.unit} × ${detail.oldRepCount ?? detail.repCount}`
    }
    return `${previousLabel} · ${formatAmount(detail, detail.oldValue)}`
  }
  if (detail.type === 'repPR') {
    return t('workout:summary.firstTimeAtReps', { repCount: detail.repCount })
  }
  return null
}
