/**
 * Sanitiza un string para usarlo como nombre de archivo
 * Reemplaza caracteres no alfanuméricos por guiones bajos
 */
export function sanitizeFilename(name) {
  if (!name) return 'file'
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

/**
 * Normaliza texto para búsquedas: minúsculas y sin tildes
 */
export function normalizeSearchText(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Bases de puntuaci\u00f3n por tramo (separaci\u00f3n 1000 \u00bb cobertura 0..100: un tramo
// mejor SIEMPRE gana al desempate por cobertura). Ver fuzzyMatchScore.
const SCORE_EXACT = 4000 // nombre === query
const SCORE_PREFIX = 3000 // el nombre empieza por la query
const SCORE_INTERIOR = 2000 // substring contiguo en el interior
const SCORE_SUBSEQUENCE = 1000 // subsecuencia dispersa

/**
 * Punt\u00faa la coincidencia de `query` dentro de `text` con b\u00fasqueda flexible por
 * subsecuencia: los caracteres de la query deben aparecer en orden dentro del
 * texto, pero NO necesariamente contiguos (buscar "pmr" encuentra "Peso Muerto
 * Rumano"). Case- y tilde-insensitive. Los espacios de la query se ignoran.
 *
 * Equivale conceptualmente a un regex `.*p.*m.*r.*` pero con un escaneo de dos
 * punteros: as\u00ed no hay que escapar la entrada del usuario ni existe riesgo de
 * ReDoS, y podemos devolver una puntuaci\u00f3n de relevancia para ordenar.
 *
 * Puntuaci\u00f3n por tramos (mayor = m\u00e1s parecido a lo buscado):
 *  - contigua exacta total (nombre === query)        => ~4000
 *  - contigua en prefijo (empieza por la query)      => ~3000
 *  - contigua en interior                            => ~2000
 *  - subsecuencia dispersa                           => ~1000
 * Dentro de cada tramo desempatan (por este orden) la cobertura (cu\u00e1nto del
 * nombre cubre la query), la dispersi\u00f3n y la posici\u00f3n de inicio. As\u00ed una
 * coincidencia contigua/compacta siempre aparece antes que una dispersa.
 *
 * @param {string} text  Texto donde buscar
 * @param {string} query T\u00e9rmino de b\u00fasqueda
 * @returns {number|null} Puntuaci\u00f3n (mayor = mejor) o null si no coincide.
 *                        Query vac\u00eda => 0 (coincide con todo, orden neutro).
 */
export function fuzzyMatchScore(text, query) {
  const q = normalizeSearchText(query).replace(/\s+/g, '')
  if (!q) return 0
  const haystack = normalizeSearchText(text)
  if (!haystack) return null

  // Cobertura (0..1): a igual tipo de coincidencia, m\u00e1s cobertura = m\u00e1s parecido.
  // Escala 0..100 << que la separaci\u00f3n de 1000 entre tramos: solo desempata.
  const coverage = (q.length / haystack.length) * 100

  // Coincidencia contigua (substring): siempre por encima de la dispersa.
  const idx = haystack.indexOf(q)
  if (idx !== -1) {
    let base
    if (idx === 0) base = haystack.length === q.length ? SCORE_EXACT : SCORE_PREFIX
    else base = SCORE_INTERIOR
    return base + coverage - idx
  }

  // Coincidencia por subsecuencia dispersa (tramo inferior). Dos punteros greedy
  // leftmost: toma el primer match de cada char (favorece inicio temprano). El
  // span resultante puede no ser el mínimo global, pero eso solo afecta al
  // desempate del ranking, no a si coincide o no.
  let cursor = 0
  let firstIdx = -1
  let lastIdx = -1
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi]
    let found = -1
    while (cursor < haystack.length) {
      if (haystack[cursor] === ch) {
        found = cursor
        cursor += 1
        break
      }
      cursor += 1
    }
    if (found === -1) return null
    if (firstIdx === -1) firstIdx = found
    lastIdx = found
  }

  // Menor dispersi\u00f3n (span), m\u00e1s cobertura y comienzo m\u00e1s temprano => mejor.
  const span = lastIdx - firstIdx + 1
  return SCORE_SUBSEQUENCE + coverage - span - firstIdx
}
