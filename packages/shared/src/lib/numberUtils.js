/**
 * Parsea un string a float aceptando tanto coma como punto decimal
 * @param {string} value - Valor a parsear (ej: "75.5" o "75,5")
 * @returns {number} Número parseado o NaN si es inválido
 */
export function parseDecimal(value) {
  if (!value) return NaN

  // Normalizar: reemplazar coma por punto
  const normalized = String(value).replace(',', '.')

  return parseFloat(normalized)
}
