import ExerciseGif from '../Workout/ExerciseGif.jsx'

/**
 * Miniatura de un ejercicio para listas/catálogo: GIF a 180 (xs) con lazy-load.
 * Delega en ExerciseGif, que ya resuelve el fallback neutro cuando el ejercicio
 * no tiene animación o la carga falla. No es interactiva (la fila decide el tap).
 */
function ExerciseThumbnail({ gifKey, alt = '', dimension = 44 }) {
  return <ExerciseGif gifKey={gifKey} size="xs" alt={alt} dimension={dimension} />
}

export default ExerciseThumbnail
