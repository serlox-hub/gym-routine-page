/**
 * Progresión automática por doble progresión, POR SERIE (issue #13).
 *
 * Modelo v1: cada serie se compara 1-a-1 con la MISMA serie (mismo número) de la
 * última sesión. Si esa serie previa alcanzó el TOPE del objetivo prescrito → se sugiere
 * subir el campo PROGRESABLE de esa serie (aviso DIRECCIONAL "sube el peso" / "sube el nivel",
 * sin cifra concreta: el salto depende del equipo —mancuernas, placas, máquina— y un número fijo
 * sería erróneo en la mayoría; ver DECISIONS #13). No hay acción "bajar": quedarse dentro
 * o por debajo del objetivo → sin sugerencia.
 *
 * Papeles de los campos (issue #28): el progresable es el peso cuando el ejercicio lo mide y el
 * NIVEL cuando no (en una máquina de cardio el nivel juega el papel del peso), y el objetivo es
 * el campo que la rutina prescribe, ya explícito en la fila. Antes esto solo funcionaba en
 * ejercicios de EXACTAMENTE peso + reps: sin saber de qué campo hablaba el objetivo, "llegaste al
 * tope" era ambiguo en cuanto había una tercera medida. Con el objetivo guardado la señal es
 * "cumpliste lo prescrito", y los demás campos son resultado.
 *
 * Autorregulación por esfuerzo (issue #13, follow-up): el objetivo es una prescripción
 * INCOMPLETA cuando la rutina fija un esfuerzo objetivo. "10 reps @ RIR 2" exige capacidad ~12;
 * hacer 10 @ RIR 0 llega al tope de reps pero 2 de esfuerzo más profundo → capacidad real ~2
 * reps por debajo de lo prescrito, aún NO has ganado la subida. Por eso, cuando hay esfuerzo
 * objetivo (rutina) Y real (serie previa), se exige además que el real no haya sido más duro que
 * el prescrito (`metEffortTarget`, en effortScale.js: la comparación se invierte entre RIR y RPE).
 * Si falta cualquiera de los dos, degrada a solo-objetivo (no bloquea): el esfuerzo es opcional y
 * no debe romper la señal.
 *
 * Toda la lógica es pura para ser DRY web+native y testeable sin React.
 */

import {
  SetField,
  formatFieldValue,
  getFieldMeta,
  getProgressableField,
  normalizeTrackedFields,
  resolveTargetField,
} from './measurementFields.js'
import { metEffortTarget } from './effortScale.js'
import { SET_TYPES } from './constants.js'
import { parseDecimal } from './numberUtils.js'
import { t } from '../i18n/index.js'

// Sufijos de unidad admitidos al leer un objetivo, por campo, con su factor a la unidad de BD
// (segundos para el tiempo, metros para la distancia). Sin sufijo NO hay unidad por defecto en
// tiempo ni distancia: "20" no dice si son segundos o minutos, y adivinarlo dispararía avisos
// falsos. Los defaults que escribe la app siempre llevan unidad (ver getDefaultTarget).
// Ojo: 'm' son MINUTOS en tiempo y METROS en distancia. No colisionan porque la tabla es por
// campo (un objetivo de tiempo nunca se lee con la fila de distancia); no lo unifiques.
const TARGET_UNITS = {
  [SetField.TIME]: { s: 1, seg: 1, segs: 1, sec: 1, secs: 1, min: 60, mins: 60, m: 60, h: 3600, hr: 3600, hrs: 3600 },
  [SetField.DISTANCE]: { m: 1, mts: 1, metros: 1, km: 1000, kms: 1000 },
  [SetField.REPS]: { '': 1, reps: 1, rep: 1, r: 1 },
  [SetField.CALORIES]: { '': 1, kcal: 1, cal: 1, cals: 1 },
}

// "20:00" en un objetivo de tiempo son 20 minutos: es el mismo formato con el que se teclea la
// duración en la fila de serie (ver durationInput.js).
const MMSS = /^(\d+):([0-5]\d)$/

/**
 * Parsea UN valor de objetivo a la unidad de BD del campo. `fallbackUnit` es la unidad tomada del
 * otro extremo del rango ("20-30min" → el 20 también son minutos).
 * @returns {{value: number, unit: string}|null}
 */
function parseTargetValue(text, targetField, fallbackUnit = '') {
  const units = TARGET_UNITS[targetField]
  if (!units) return null

  const str = text.trim()
  if (!str) return null

  if (targetField === SetField.TIME) {
    const mmss = str.match(MMSS)
    if (mmss) return { value: parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10), unit: 'min' }
  }

  const match = str.match(/^(\d+(?:[.,]\d+)?)\s*([a-z]*)$/)
  if (!match) return null
  const num = parseDecimal(match[1])
  if (isNaN(num)) return null

  const unit = match[2] || fallbackUnit
  const factor = units[unit]
  if (factor == null) return null
  return { value: num * factor, unit }
}

/**
 * Parsea el objetivo de la rutina (texto libre) al rango { min, max } EN LA UNIDAD DE BD del campo
 * objetivo: reps, segundos, metros o kcal. Devuelve null cuando no hay un tope numérico claro y
 * por tanto no se puede doble-progresar: "AMRAP", "8+", "20" en un objetivo de tiempo, vacío.
 * Normaliza rangos invertidos ("12-8" → { min: 8, max: 12 }) y tolera espacios.
 * @param {string|number|null} target - `routine_exercises.reps` (el VALOR del objetivo)
 * @param {string|null} targetField - campo del que habla ese valor
 * @returns {{min: number, max: number}|null}
 */
export function parseTargetRange(target, targetField) {
  if (target == null || !targetField) return null
  const str = String(target).trim().toLowerCase()
  if (!str) return null

  // El rango se parte por el guion, pero "20:00" y los decimales con coma no se tocan.
  const parts = str.split('-')
  if (parts.length > 2) return null

  if (parts.length === 1) {
    const single = parseTargetValue(parts[0], targetField)
    return single ? { min: single.value, max: single.value } : null
  }

  // "20-30min": el extremo sin unidad hereda la del otro.
  const high = parseTargetValue(parts[1], targetField)
  if (!high) return null
  const low = parseTargetValue(parts[0], targetField, high.unit)
  if (!low) return null
  return low.value <= high.value
    ? { min: low.value, max: high.value }
    : { min: high.value, max: low.value }
}

/**
 * ¿Esta serie de la última sesión alcanzó (≥) el tope del objetivo prescrito? Es la señal de
 * progresión por serie: true → sugerir subir el progresable de esta serie.
 *
 * Excluye dropsets y series sin el dato del objetivo o del progresable. Exige que el ejercicio
 * tenga progresable (peso o nivel) y que el campo objetivo sea uno de los que mide: si el
 * objetivo no se registra en la serie no hay nada que comparar.
 * @param {object} params
 * @param {{setType?: string}|null|undefined} params.previousSet - serie previa en claves de display
 * @param {string|number|null} params.target - valor del objetivo (`routine_exercises.reps`)
 * @param {string[]} params.trackedFields - campos del ejercicio
 * @param {string|null} [params.targetField] - campo objetivo guardado en la fila
 * @returns {boolean}
 */
export function didSetHitTop({ previousSet, target, trackedFields, targetField }) {
  const fields = normalizeTrackedFields(trackedFields)
  const progressable = getProgressableField(fields)
  if (!progressable) return false

  const field = resolveTargetField(targetField, fields)
  if (!field || !fields.includes(field)) return false

  if (!previousSet || previousSet.setType === SET_TYPES.DROPSET) return false
  const achieved = previousSet[getFieldMeta(field).displayKey]
  const from = previousSet[getFieldMeta(progressable).displayKey]
  if (achieved == null || from == null) return false

  const range = parseTargetRange(target, field)
  if (!range) return false
  return Number(achieved) >= range.max
}

/**
 * ¿Mostrar la sugerencia de subir el progresable para esta serie? Combina el disparador del
 * objetivo (`didSetHitTop`) con el gate de esfuerzo (`metEffortTarget`) y el "nudge cumplido": se
 * apaga cuando el valor tecleado hoy ya supera al de la serie anterior. Los flags de UI
 * (preferencia on/off, serie completada) se quedan en el componente; esto es la parte pura.
 * @param {object} params
 * @param {object|null|undefined} params.previousSet
 * @param {string|number|null} params.target
 * @param {string[]} params.trackedFields
 * @param {string|null} [params.targetField]
 * @param {number|string|null} params.currentProgressable - valor tecleado hoy en la columna del
 *   progresable (peso o nivel). Vacío/NaN cuenta como "aún no ha subido" → sigue sugiriendo.
 * @param {number|null} [params.effortTarget] - esfuerzo objetivo de la rutina (`rir`); null → gate inactivo.
 * @returns {boolean}
 */
export function shouldSuggestProgression({ previousSet, target, trackedFields, targetField, currentProgressable, effortTarget }) {
  if (!didSetHitTop({ previousSet, target, trackedFields, targetField })) return false
  if (!metEffortTarget(previousSet.rir, effortTarget, trackedFields)) return false
  const progressable = getProgressableField(trackedFields)
  const previousValue = previousSet[getFieldMeta(progressable).displayKey]
  return !(parseDecimal(currentProgressable) > Number(previousValue))
}

/**
 * Texto del aviso ("Sube el peso" / "Sube el nivel"). Depende del progresable, así que no puede
 * ser una cadena fija: en un cardio lo que se sube es el nivel.
 * @param {string[]} trackedFields
 * @returns {string} '' si el ejercicio no tiene nada que subir
 */
export function getProgressionLabel(trackedFields) {
  const progressable = getProgressableField(trackedFields)
  return progressable ? t(`workout:progression.increase.${progressable}`) : ''
}

/**
 * Explicación del aviso ("Llegaste al tope del objetivo…"), con el objetivo prescrito y lo que se
 * hizo la última vez ya formateados en la unidad del campo.
 * @param {object} params - mismos que `didSetHitTop`, más la unidad de distancia para el formato
 * @returns {string}
 */
export function getProgressionReason({ previousSet, target, trackedFields, targetField, distanceUnit = 'm' }) {
  const progressable = getProgressableField(trackedFields)
  if (!progressable) return ''
  const field = resolveTargetField(targetField, trackedFields)
  const achieved = field ? previousSet?.[getFieldMeta(field).displayKey] : null
  return t(`workout:progression.why.${progressable}`, {
    target: String(target ?? ''),
    value: achieved != null ? formatAchieved(field, achieved, distanceUnit) : '',
  })
}

// El valor conseguido se pinta con la unidad del campo objetivo ("12 reps", "20:00", "5km"): sin
// ella "12" y "1200" no dicen nada.
function formatAchieved(field, value, distanceUnit) {
  return formatFieldValue(field, value, { distanceUnit, repsUnit: true })
}
