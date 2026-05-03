import { t } from '../i18n/index.js'

// Prioridad para ordenar records dentro de una tarjeta de PR.
// Más bajo = más relevante. repPR cuenta la historia más concreta,
// 1RM la señal de fuerza global, weight el "heaviest ever".
const PRIORITY = {
  repPR: 0,
  best1rm: 1,
  bestWeight: 2,
}

const REP_PR_GROUP_THRESHOLD = 3

/**
 * Prepara una entrada de pr (ejercicio con records) para una tarjeta de share.
 * Ordena por prioridad y agrupa rep-PRs si hay ≥3 en una sola línea.
 *
 * @param {Object} pr - { exerciseName, details: [{type, newValue, oldValue, unit, repCount?, ...}] }
 * @returns {Object} { exerciseName, details, mode: 'hero' | 'list' }
 */
export function preparePRCardData(pr) {
  if (!pr || !pr.details || pr.details.length === 0) return null

  const sorted = [...pr.details].sort((a, b) => {
    const pa = PRIORITY[a.type] ?? 99
    const pb = PRIORITY[b.type] ?? 99
    return pa - pb
  })

  const repPRs = sorted.filter(d => d.type === 'repPR')
  let details = sorted
  if (repPRs.length >= REP_PR_GROUP_THRESHOLD) {
    const others = sorted.filter(d => d.type !== 'repPR')
    const counts = repPRs.map(r => r.repCount).sort((a, b) => a - b)
    const values = counts.map(c => repPRs.find(r => r.repCount === c).newValue)
    details = [
      ...others,
      { type: 'repPRGroup', counts, values, unit: 'kg' },
    ]
  }

  return {
    exerciseName: pr.exerciseName,
    details,
    mode: details.length === 1 ? 'hero' : 'list',
  }
}

/**
 * Devuelve la etiqueta traducida para un detalle de PR según su tipo.
 */
export function formatPRDetailLabel(detail) {
  switch (detail.type) {
    case 'bestWeight':
      return t('workout:summary.heaviestEver')
    case 'best1rm':
      return t('workout:summary.oneRMEstimate')
    case 'repPR':
      return t('workout:pr.repPR', { repCount: detail.repCount })
    case 'repPRGroup':
      return t('workout:summary.repPRGroup', {
        counts: detail.counts.join(', '),
        values: detail.values.join(', '),
      })
    case 'totalVolume':
      return t('workout:pr.volume')
    case 'bestTimeSeconds':
      return t('workout:pr.time')
    case 'bestDistanceMeters':
      return t('workout:pr.distance')
    case 'bestPaceSeconds':
      return t('workout:pr.time') // Pace cae bajo "Tiempo" como fallback
    default:
      return detail.label || ''
  }
}

/**
 * Devuelve el string del valor principal del detalle (formato hero):
 * - repPR: "{weight} kg × {repCount}"
 * - resto: "{newValue} {unit}"
 * - repPRGroup: null (rendering especial necesario)
 */
export function formatPRDetailValue(detail) {
  if (detail.type === 'repPRGroup') return null
  if (detail.type === 'repPR') {
    return `${detail.newValue} ${detail.unit} × ${detail.repCount}`
  }
  return `${detail.newValue} ${detail.unit}`
}

/**
 * Devuelve el string del valor "anterior" del detalle:
 * - "anterior · 105 kg" si hay oldValue
 * - "primera vez a 5 reps" si type=repPR y oldValue=null
 * - null para repPRGroup o cuando no hay info contextual relevante
 */
export function formatPRDetailPrevious(detail) {
  if (detail.type === 'repPRGroup') return null
  const previousLabel = t('workout:summary.previousLabel')
  if (detail.oldValue != null) {
    if (detail.type === 'repPR') {
      return `${previousLabel} · ${detail.oldValue} ${detail.unit} × ${detail.repCount}`
    }
    return `${previousLabel} · ${detail.oldValue} ${detail.unit}`
  }
  if (detail.type === 'repPR') {
    return t('workout:summary.firstTimeAtReps', { repCount: detail.repCount })
  }
  return null
}

/**
 * Devuelve solo el valor numérico para el lado derecho de las filas en modo lista
 * (formato de la variante B). Para repPRGroup junta los valores.
 */
export function formatPRDetailListValue(detail) {
  if (detail.type === 'repPRGroup') {
    return `${detail.values.join(', ')} ${detail.unit}`
  }
  if (detail.type === 'repPR') {
    return `${detail.newValue} ${detail.unit}`
  }
  return `${detail.newValue} ${detail.unit}`
}
