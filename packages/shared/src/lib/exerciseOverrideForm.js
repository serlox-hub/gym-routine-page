import { resolveTrackedFields, tracksDistance } from './measurementFields.js'

/**
 * Estado derivado del panel de override de un ejercicio del SISTEMA (lo que el usuario puede
 * ajustar de un ejercicio que no es suyo: notas y unidad de distancia).
 *
 * Vive aquí y no en los componentes porque web y native lo necesitan idéntico y el payload tiene
 * una trampa que no aguanta estar duplicada: la clave `distanceUnit` solo viaja cuando el ejercicio
 * ya cargó. `upsertUserExerciseOverride` solo escribe la columna si la clave está presente, y sin
 * la unidad del catálogo el "coincide con el catálogo" se calcularía contra un `'m'` inventado, así
 * que guardar solo las notas durante esa ventana borraría el override que el usuario tuviera.
 *
 * @param {{exercise?: Object|null, exerciseId: number|string, notes?: string,
 *   distanceUnit?: 'm'|'km'|null}} params - `distanceUnit` es lo elegido en el panel
 *   (null = todavía hereda del catálogo)
 * @returns {{effectiveDistanceUnit: 'm'|'km', showDistanceUnit: boolean, payload: Object}}
 */
export function buildExerciseOverrideForm({ exercise, exerciseId, notes, distanceUnit }) {
  const catalogDistanceUnit = exercise?.distance_unit || 'm'
  const effectiveDistanceUnit = distanceUnit || catalogDistanceUnit
  // null = hereda la del ejercicio. Se guarda null cuando la elegida coincide con la del catálogo,
  // para no congelar una preferencia que ya es la correcta (y que el catálogo podría cambiar).
  const overrideValue = effectiveDistanceUnit === catalogDistanceUnit ? null : effectiveDistanceUnit

  return {
    effectiveDistanceUnit,
    // Sin ejercicio cargado, `resolveTrackedFields` cae en el default (peso × reps) y el selector
    // no se pinta: es lo correcto, no se ofrece elegir una unidad que quizá no aplica.
    showDistanceUnit: tracksDistance(resolveTrackedFields(exercise)),
    payload: { exerciseId, notes, ...(exercise ? { distanceUnit: overrideValue } : {}) },
  }
}
