import ExerciseGif from '../Workout/ExerciseGif'

/**
 * Miniatura de un ejercicio para listas/catálogo: GIF a 180 (xs). En el FlatList
 * solo se montan las filas visibles, así que la carga es lazy. Delega en
 * ExerciseGif, que ya resuelve el fallback neutro cuando el ejercicio no tiene
 * animación o la carga falla. No es interactiva (la fila decide el tap).
 */
function ExerciseThumbnail({ gifKey, alt = '', dimension = 44 }) {
  return <ExerciseGif gifKey={gifKey} size="xs" alt={alt} dimension={dimension} />
}

export default ExerciseThumbnail
