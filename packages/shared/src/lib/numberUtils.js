/**
 * Parsea un string a float aceptando tanto coma como punto decimal
 * @param {string} value - Valor a parsear (ej: "75.5" o "75,5")
 * @returns {number} Número parseado o NaN si es inválido
 */
export function parseDecimal(value) {
  if (value === null || value === undefined || value === '') return NaN

  // Normalizar: reemplazar coma por punto
  const normalized = String(value).replace(',', '.')

  return parseFloat(normalized)
}

/**
 * Convierte un string/número a float para persistencia, devolviendo null si está vacío
 * o no es un número válido. Preserva el 0 como valor numérico legítimo.
 */
export function toNullableFloat(value) {
  if (value === null || value === undefined || value === '') return null
  const n = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Convierte un string/número a entero para persistencia, devolviendo null si está vacío
 * o no es un número válido. Preserva el 0 como valor numérico legítimo.
 */
export function toNullableInt(value) {
  if (value === null || value === undefined || value === '') return null
  const n = parseInt(String(value).replace(',', '.'), 10)
  return Number.isFinite(n) ? n : null
}
