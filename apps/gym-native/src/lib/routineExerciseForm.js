/**
 * Parsea el formulario de configuración de ejercicio (strings) a datos tipados
 * para enviar al servidor.
 */
export function parseExerciseConfigForm(form, { defaultReps = '8-12' } = {}) {
  return {
    series: parseInt(form.series) || 3,
    reps: form.reps || defaultReps,
    rir: form.rir !== '' ? parseInt(form.rir) : null,
    rest_seconds: form.rest_seconds ? parseInt(form.rest_seconds) : null,
    notes: form.notes || null,
    tempo: form.tempo || null,
    tempo_razon: form.tempo_razon || null,
    superset_group: form.superset_group !== '' ? parseInt(form.superset_group) : null,
  }
}
