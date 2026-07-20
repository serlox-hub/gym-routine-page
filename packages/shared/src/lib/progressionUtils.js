/**
 * Progresión automática por doble progresión, POR SERIE (issue #13).
 *
 * Modelo v1: cada serie se compara 1-a-1 con la MISMA serie (mismo número) de la
 * última sesión. Si esa serie previa alcanzó el TOPE del rango de reps → se sugiere
 * subir el peso de esa serie (aviso DIRECCIONAL "sube el peso", sin peso concreto:
 * el salto depende del equipo —mancuernas, placas, máquina— y un número fijo sería
 * erróneo en la mayoría; ver DECISIONS #13). No hay acción "bajar": quedarse dentro
 * o por debajo del rango → sin sugerencia.
 *
 * Solo aplica a `weight_reps` (único tipo con peso + reps y rango libre de reps).
 * Toda la lógica es pura para ser DRY web+native y testeable sin React.
 */

import { MeasurementType } from './measurementTypes.js'
import { SET_TYPES } from './constants.js'
import { parseDecimal } from './numberUtils.js'

/**
 * Parsea el rango libre de reps a { min, max }. Devuelve null cuando no hay un
 * tope numérico claro (no se puede doble-progresar): "AMRAP", "8+", vacío, etc.
 * Normaliza rangos invertidos ("12-8" → { min: 8, max: 12 }) y tolera espacios.
 * @param {string|number|null} reps
 * @returns {{min: number, max: number}|null}
 */
export function parseRepsRange(reps) {
  if (reps == null) return null
  const str = String(reps).trim()
  if (!str) return null

  const rangeMatch = str.match(/^(\d+)\s*-\s*(\d+)$/)
  if (rangeMatch) {
    let min = parseInt(rangeMatch[1], 10)
    let max = parseInt(rangeMatch[2], 10)
    if (min > max) [min, max] = [max, min]
    return { min, max }
  }

  const singleMatch = str.match(/^(\d+)$/)
  if (singleMatch) {
    const n = parseInt(singleMatch[1], 10)
    return { min: n, max: n }
  }

  return null
}

/**
 * ¿Esta serie de la última sesión alcanzó (≥) el tope del rango de reps? Es la
 * señal de progresión por serie: true → sugerir subir el peso de esta serie.
 * Excluye dropsets y series sin peso/reps; solo aplica a weight_reps.
 * @param {{weight?: number|null, reps?: number|null, setType?: string}|null|undefined} previousSet
 * @param {string} repsTarget - rango objetivo (ej. "8-12")
 * @param {string} measurementType
 * @returns {boolean}
 */
export function didSetHitTop(previousSet, repsTarget, measurementType) {
  if (measurementType !== MeasurementType.WEIGHT_REPS) return false
  if (!previousSet || previousSet.setType === SET_TYPES.DROPSET) return false
  if (previousSet.weight == null || previousSet.reps == null) return false
  const range = parseRepsRange(repsTarget)
  if (!range) return false
  return Number(previousSet.reps) >= range.max
}

/**
 * ¿Mostrar la sugerencia de subir peso para esta serie? Combina el disparador
 * (`didSetHitTop`) con el "nudge cumplido": se apaga cuando el peso tecleado hoy ya
 * supera al de la serie anterior. Los flags de UI (preferencia on/off, serie completada)
 * se quedan en el componente; esto es la parte pura compartida web/native.
 * @param {object} params
 * @param {{weight?: number|null, reps?: number|null, setType?: string}|null|undefined} params.previousSet
 * @param {string} params.repsTarget - rango objetivo (ej. "8-12")
 * @param {string} params.measurementType
 * @param {number|string|null} params.currentWeight - peso tecleado hoy (string del input o número).
 *   Vacío/NaN cuenta como "aún no ha subido" → sigue sugiriendo.
 * @returns {boolean}
 */
export function shouldSuggestProgression({ previousSet, repsTarget, measurementType, currentWeight }) {
  if (!didSetHitTop(previousSet, repsTarget, measurementType)) return false
  return !(parseDecimal(currentWeight) > Number(previousSet.weight))
}
