// Media (GIF) de ejercicios: animaciones de Gym Visual alojadas en
// Supabase Storage (bucket público `exercise-gifs`, subcarpeta `gif/`).
// Ver issue #6. La URL pública se resuelve en la capa api (getExerciseGifUrl)
// porque necesita el cliente Supabase inyectado; aquí vive la lógica pura.

export const GIF_BUCKET = 'exercise-gifs'

// Resoluciones subidas al bucket (px). Cada superficie usa el tamaño mínimo
// que necesita para minimizar egress:
//   xs (180) → listas/thumbnails · sm (360) → tarjeta de sesión · lg (720) → pantalla completa
export const GIF_SIZES = { xs: 180, sm: 360, lg: 720 }

/**
 * Ruta del objeto GIF dentro del bucket para un ejercicio.
 * Función pura (no depende del cliente): fácilmente testeable.
 * @param {string|number|null} gifKey - `exercises.gif_key` (id de producto Gym Visual)
 * @param {'xs'|'sm'|'lg'} [size='sm'] - tamaño; desconocido → 'sm'
 * @returns {string|null} ruta relativa `gif/<key>_<px>.gif`, o null si no hay gif_key
 */
export function getExerciseGifPath(gifKey, size = 'sm') {
  if (!gifKey) return null
  const px = GIF_SIZES[size] ?? GIF_SIZES.sm
  return `gif/${gifKey}_${px}.gif`
}
