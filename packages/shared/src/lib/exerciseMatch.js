/**
 * Emparejamiento de ejercicios importados con el catálogo/custom por CLAVE ESTABLE.
 *
 * El import de rutinas (JSON) nació antes del catálogo y emparejaba por `name_es`
 * (nombre localizado) → frágil: se rompe con otro idioma, tildes perdidas de la IA,
 * mayúsculas o renombres. Ahora se empareja por `name_en` (único y 100% poblado en los
 * ejercicios de sistema; ya es la clave de join de las migraciones de GIF) con fallback a
 * `name_es`, normalizando de forma tolerante (minúsculas + sin acentos + espacios).
 *
 * `name_en` sirve de clave estable SOLO para ejercicios de sistema; los custom del usuario
 * no tienen `name_en`, así que casan por `name_es`. Ver docs/DECISIONS.md.
 */

// Diacríticos combinantes (tras NFD): á→a, ñ→n, ü→u
const COMBINING_MARKS = /\p{Diacritic}/gu

/**
 * Normaliza un nombre para comparación tolerante: minúsculas, sin diacríticos/acentos,
 * trim y espacios internos colapsados. Cadena vacía para null/undefined/''.
 * @param {string} name
 * @returns {string}
 */
export function normalizeExerciseName(name) {
  if (!name) return ''
  return String(name)
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Construye el índice nombre-normalizado → exercise_id. Prioridad de inserción
 * (no se pisan claves ya puestas):
 *   1) name_en de sistema  — clave estable, gana ante colisiones
 *   2) name_es de customs  — preferir el propio ejercicio del usuario ante colisión ES
 *   3) name_es de sistema  — fallback
 * @param {{systemRows?: Array<{id:*,name_es?:string,name_en?:string}>, customRows?: Array<{id:*,name_es?:string}>}} params
 * @returns {Map<string, *>}
 */
export function buildExerciseIndex({ systemRows = [], customRows = [] } = {}) {
  const index = new Map()
  const put = (name, id) => {
    const key = normalizeExerciseName(name)
    if (key && !index.has(key)) index.set(key, id)
  }
  for (const row of systemRows) put(row.name_en, row.id)
  for (const row of customRows) put(row.name_es, row.id)
  for (const row of systemRows) put(row.name_es, row.id)
  return index
}

/**
 * Resuelve el id de un ejercicio exportado contra el índice.
 * Prioridad de claves del export: name_en → name_es → name.
 * @param {{name_en?:string, name_es?:string, name?:string}} exported
 * @param {Map<string, *>} index
 * @returns {*} id del ejercicio, o null si no hay match
 */
export function resolveExerciseId(exported, index) {
  if (!exported || !index) return null
  for (const candidate of [exported.name_en, exported.name_es, exported.name]) {
    const key = normalizeExerciseName(candidate)
    if (key && index.has(key)) return index.get(key)
  }
  return null
}
