/**
 * Entrada de duración por dígitos (patrón de cronómetro): se teclean números y se rellenan
 * desde la derecha — "3" → 0:03, "130" → 1:30, "2000" → 20:00, "32400" → 3:24:00. Es lo que permite
 * meter una duración en UN solo input estrecho (la fila de serie no tiene ancho para dos cajas
 * mm + ss; ver docs/DECISIONS.md), y evita la ambigüedad de "¿30 es medio minuto o media hora?".
 *
 * Los dígitos son el estado que teclea el usuario; el valor real siempre son SEGUNDOS.
 * Durante el tecleo se admite un `ss` > 59 ("0:75"); al salir del campo se normaliza
 * (secondsToDurationDigits(75) → "115" → "1:15").
 */

// Los dos últimos dígitos son segundos, los dos siguientes minutos y el resto horas: el mismo
// desglose que `formatDuration`, para que el input y el resto de la app lean igual el mismo valor
// (con solo mm:ss, 12240s se veía "204:00" en el input y "3:24:00" en el detalle).
// 5 dígitos = hasta 9:59:59: tope de TECLEO (evita valores absurdos por tecleo accidental), NO de
// lectura. ⚠️ No lo metas en `sanitizeDurationDigits`: una serie de 10h ya guardada (36000s) se
// pintaría "1:00:00" — un valor falso, no un límite de UI.
const MAX_DURATION_DIGITS = 5

/**
 * Deja solo dígitos y quita ceros a la izquierda. Sin límite de longitud: lee cualquier valor ya
 * guardado. Para el tecleo usa `clampDurationDigits`.
 * @param {string|number} raw
 * @returns {string}
 */
export function sanitizeDurationDigits(raw) {
  return String(raw ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}

/**
 * Lo que se acepta TECLEANDO: dígitos normalizados y acotados a 9:59:59.
 * ⚠️ El `'0'` suelto se trata como vacío o el campo NO se puede borrar: al hacer Backspace sobre
 * "0:05" el DOM devuelve "0:0" → dígitos "0" → se repintaría "0:00" para siempre. Solo afecta al
 * tecleo; un 0 ya guardado (lo pone `buildEmptySetData`) se sigue leyendo "0:00".
 * @param {string|number} raw
 * @returns {string}
 */
export function clampDurationDigits(raw) {
  const digits = sanitizeDurationDigits(raw)
  return digits === '0' ? '' : digits.slice(0, MAX_DURATION_DIGITS)
}

/**
 * Dígitos → segundos. Los dos últimos son segundos, los dos siguientes minutos, el resto horas.
 * @param {string} digits
 * @returns {number|''} '' si no hay dígitos (campo vacío, no 0)
 */
export function durationDigitsToSeconds(digits) {
  const clean = sanitizeDurationDigits(digits)
  if (!clean) return ''
  const seconds = parseInt(clean.slice(-2), 10)
  const minutes = clean.length > 2 ? parseInt(clean.slice(-4, -2), 10) : 0
  const hours = clean.length > 4 ? parseInt(clean.slice(0, -4), 10) : 0
  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Segundos → dígitos normalizados (ss y mm < 60). Inversa de durationDigitsToSeconds.
 * @param {number|string|null} seconds
 * @returns {string}
 */
export function secondsToDurationDigits(seconds) {
  if (seconds === '' || seconds == null) return ''
  const total = Math.max(0, Math.round(Number(seconds)))
  if (Number.isNaN(total)) return ''
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) return `${hours}${String(minutes).padStart(2, '0')}${String(secs).padStart(2, '0')}`
  return minutes > 0 ? `${minutes}${String(secs).padStart(2, '0')}` : String(secs)
}

/**
 * Dígitos → texto visible mientras se teclea ("2000" → "20:00", "5" → "0:05", "32400" → "3:24:00").
 * @param {string} digits
 * @returns {string} '' si no hay dígitos (el input muestra su placeholder)
 */
export function formatDurationDigits(digits) {
  const clean = sanitizeDurationDigits(digits)
  if (!clean) return ''
  const seconds = clean.slice(-2).padStart(2, '0')
  if (clean.length <= 2) return `0:${seconds}`
  const minutes = clean.slice(-4, -2)
  if (clean.length <= 4) return `${minutes}:${seconds}`
  return `${clean.slice(0, -4)}:${minutes.padStart(2, '0')}:${seconds}`
}
