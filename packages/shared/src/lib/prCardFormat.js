import { t } from '../i18n/index.js'

/**
 * Devuelve el string del valor principal del detalle (formato hero):
 * - repPR: "{weight} kg × {repCount}"
 * - resto: "{newValue} {unit}"
 */
export function formatPRDetailValue(detail) {
  if (detail.type === 'repPR') {
    return `${detail.newValue} ${detail.unit} × ${detail.repCount}`
  }
  return `${detail.newValue} ${detail.unit}`
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
    return `${previousLabel} · ${detail.oldValue} ${detail.unit}`
  }
  if (detail.type === 'repPR') {
    return t('workout:summary.firstTimeAtReps', { repCount: detail.repCount })
  }
  return null
}
