/**
 * Escala de esfuerzo de una serie: RIR o RPE.
 *
 * Cuál se usa lo decide UN dato: si el ejercicio mide reps. Con reps se habla de "reps en reserva"
 * (RIR, escala F/0/1/2/3+, donde el número ES el dato); sin reps eso no significa nada y se usa
 * RPE (1-5), donde el número guardado es un índice interno y la PALABRA es el dato.
 * Por eso un valor de esfuerzo nunca se renderiza crudo: siempre por `formatEffortBadge`.
 */

import { t } from '../i18n/index.js'
import { RIR_LABELS, RPE_LABELS, RIR_OPTIONS, RPE_OPTIONS } from './constants.js'
import { tracksReps } from './measurementFields.js'

/** Etiqueta del campo de esfuerzo en formularios ("RIR" con reps, "Esfuerzo" en RPE). */
export function getEffortLabel(trackedFields) {
  return tracksReps(trackedFields) ? t('exercise:effort.rir') : t('exercise:effort.effort')
}

/**
 * ¿El esfuerzo se pinta como PALABRA ("Moderado", escala RPE) en vez del compacto "@2" (RIR)?
 * Decide a la vez el ancho de la columna «Notas» de la fila de serie y el tamaño de fuente del
 * chip: si fila y chip lo resolvieran por separado, el pill se saldría de su celda.
 * @param {string[]} trackedFields
 * @param {boolean} [showEffortScale] - preferencia show_rir_input; apagada no hay palabra que medir
 * @returns {boolean}
 */
export function effortRendersAsWord(trackedFields, showEffortScale = true) {
  return !!showEffortScale && !tracksReps(trackedFields)
}

/**
 * Opciones de esfuerzo para el selector inline según lo que mide el ejercicio.
 * Fuente única compartida por el chip inline y la hoja de detalles.
 * @returns {Array<{value: number, label: string}>}
 */
export function getEffortOptions(trackedFields) {
  return tracksReps(trackedFields) ? RIR_OPTIONS : RPE_OPTIONS
}

/**
 * ¿`value` es un valor de esfuerzo válido en la escala de este ejercicio?
 * La escala cambia con los campos (RIR incluye -1 = "F"; RPE va de 1 a 5), así que un rango
 * numérico fijo no sirve: se valida contra las opciones reales.
 */
export function isValidEffortValue(value, trackedFields) {
  return getEffortOptions(trackedFields).some(opt => opt.value === value)
}

/**
 * ¿El esfuerzo real de la serie cumplió el prescrito, es decir NO fue más duro de lo pedido?
 * Es el gate de autorregulación de la progresión (ver progressionUtils).
 *
 * La comparación se INVIERTE entre las dos escalas y por eso no puede vivir fuera de aquí:
 * en RIR el número son reps en reserva (3 es más fácil que 0, cumple si `real >= objetivo`),
 * mientras que en RPE es esfuerzo percibido (5 es más duro que 1, cumple si `real <= objetivo`).
 * Degrada a `true` (no bloquea) si falta el objetivo (rutina sin esfuerzo) o el real (no se
 * registró): el esfuerzo es opcional y en ese caso la decisión cae a solo-objetivo.
 * @param {number|null|undefined} actual - esfuerzo real de la serie previa
 * @param {number|null|undefined} target - esfuerzo objetivo de la rutina
 * @param {string[]} trackedFields
 * @returns {boolean}
 */
export function metEffortTarget(actual, target, trackedFields) {
  if (actual == null || target == null) return true
  return tracksReps(trackedFields)
    ? Number(actual) >= Number(target)
    : Number(actual) <= Number(target)
}

/**
 * Info de display de un valor de esfuerzo guardado. Devuelve { label, description } o null.
 */
export function getEffortInfo(value, trackedFields) {
  if (value == null) return null
  const labels = tracksReps(trackedFields) ? RIR_LABELS : RPE_LABELS
  return { label: labels[value]?.label ?? String(value), description: labels[value]?.description ?? '' }
}

/**
 * Único formato de esfuerzo para mostrar: "@1" en la escala RIR, la etiqueta ("Fácil") en RPE,
 * donde el número guardado es un índice interno que no significa nada para el usuario.
 * @param {number|null} value
 * @param {string[]} trackedFields - sin campos cae en el default (peso × reps) → escala RIR, igual
 *   que el resto de lecturas: un índice RPE mal interpretado pintaría una palabra falsa.
 * @returns {string} Cadena vacía cuando value es null/undefined.
 */
export function formatEffortBadge(value, trackedFields) {
  if (value == null) return ''
  const label = getEffortInfo(value, trackedFields)?.label ?? String(value)
  return tracksReps(trackedFields) ? `@${label}` : label
}
