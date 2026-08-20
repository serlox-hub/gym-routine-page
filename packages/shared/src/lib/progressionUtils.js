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
 *
 * Autorregulación por RIR (issue #13, follow-up): el rango de reps es una prescripción
 * INCOMPLETA cuando la rutina fija un RIR objetivo. "10 reps @ RIR 2" exige capacidad ~12;
 * hacer 10 @ RIR 0 llega al tope de reps pero 2 de esfuerzo más profundo → capacidad real ~2
 * reps por debajo de lo prescrito, aún NO has ganado la subida. Por eso, cuando hay RIR objetivo
 * (rutina) Y RIR real (serie previa), se exige además `rirActual >= rirTarget`. Si falta cualquiera
 * de los dos, degrada a solo-reps (no bloquea): el RIR es opcional y no debe romper la señal.
 *
 * Toda la lógica es pura para ser DRY web+native y testeable sin React.
 */

import { SetField, normalizeTrackedFields } from './measurementFields.js'
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
 * Excluye dropsets y series sin peso/reps. Solo aplica a ejercicios que miden EXACTAMENTE peso
 * y reps: la señal es "llegaste al tope del rango, sube el peso", y con una tercera dimensión
 * (tiempo, nivel…) el tope de reps ya no implica que toque subir.
 * @param {{weight?: number|null, reps?: number|null, setType?: string}|null|undefined} previousSet
 * @param {string} repsTarget - rango objetivo (ej. "8-12")
 * @param {string[]} trackedFields - campos del ejercicio
 * @returns {boolean}
 */
export function didSetHitTop(previousSet, repsTarget, trackedFields) {
  const fields = normalizeTrackedFields(trackedFields)
  if (fields.length !== 2 || !fields.includes(SetField.WEIGHT) || !fields.includes(SetField.REPS)) return false
  if (!previousSet || previousSet.setType === SET_TYPES.DROPSET) return false
  if (previousSet.weight == null || previousSet.reps == null) return false
  const range = parseRepsRange(repsTarget)
  if (!range) return false
  return Number(previousSet.reps) >= range.max
}

/**
 * ¿El esfuerzo de la serie previa fue igual o MENOR (más fácil) que el prescrito?
 * Es decir, RIR real ≥ RIR objetivo → llegaste al tope guardando al menos la reserva pedida,
 * así que el peso está listo para subir. Gate de autorregulación (ver cabecera del módulo).
 * Degrada a `true` (no bloquea) si falta el objetivo (rutina sin RIR) o el real (no se registró):
 * el RIR es opcional y en ese caso la decisión cae a solo-reps.
 * @param {number|null|undefined} rirActual - RIR real de la serie previa (`previousSet.rir`)
 * @param {number|null|undefined} rirTarget - RIR objetivo de la rutina (`routine_exercises.rir`)
 * @returns {boolean}
 */
export function metEffortTarget(rirActual, rirTarget) {
  if (rirActual == null || rirTarget == null) return true
  return Number(rirActual) >= Number(rirTarget)
}

/**
 * ¿Mostrar la sugerencia de subir peso para esta serie? Combina el disparador de reps
 * (`didSetHitTop`) con el gate de esfuerzo (`metEffortTarget`) y el "nudge cumplido": se apaga
 * cuando el peso tecleado hoy ya supera al de la serie anterior. Los flags de UI (preferencia
 * on/off, serie completada) se quedan en el componente; esto es la parte pura web/native.
 * @param {object} params
 * @param {{weight?: number|null, reps?: number|null, rir?: number|null, setType?: string}|null|undefined} params.previousSet
 * @param {string} params.repsTarget - rango objetivo (ej. "8-12")
 * @param {string[]} params.trackedFields
 * @param {number|string|null} params.currentWeight - peso tecleado hoy (string del input o número).
 *   Vacío/NaN cuenta como "aún no ha subido" → sigue sugiriendo.
 * @param {number|null} [params.rirTarget] - RIR objetivo de la rutina; null/ausente → gate de esfuerzo inactivo.
 * @returns {boolean}
 */
export function shouldSuggestProgression({ previousSet, repsTarget, trackedFields, currentWeight, rirTarget }) {
  if (!didSetHitTop(previousSet, repsTarget, trackedFields)) return false
  if (!metEffortTarget(previousSet.rir, rirTarget)) return false
  return !(parseDecimal(currentWeight) > Number(previousSet.weight))
}
