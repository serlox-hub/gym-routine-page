import { Button } from '../ui/index.js'
import { colors, inputStyle } from '../../lib/styles.js'
import { getRepsLabel, getRepsPlaceholder } from '../../lib/measurementTypes.js'

/**
 * Formulario para configurar series, reps, tempo, notas de un ejercicio
 */
function ExerciseConfigForm({
  exercise,
  form,
  setForm,
  onSubmit,
  onBack,
  isPending,
  isSessionMode = false
}) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className="p-3 rounded-lg"
        style={{ backgroundColor: 'rgba(88, 166, 255, 0.1)' }}
      >
        <div className="font-medium" style={{ color: colors.textPrimary }}>
          {exercise.nombre}
        </div>
      </div>

      {/* Campos obligatorios */}
      <div className={`grid gap-3 ${isSessionMode ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
            Series <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="number"
            min="1"
            value={form.series}
            onChange={(e) => setForm(prev => ({ ...prev, series: e.target.value }))}
            className="w-full p-3 rounded-lg text-base"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
            {getRepsLabel(exercise.measurement_type)} <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="text"
            value={form.reps}
            onChange={(e) => setForm(prev => ({ ...prev, reps: e.target.value }))}
            placeholder={getRepsPlaceholder(exercise.measurement_type)}
            className="w-full p-3 rounded-lg text-base"
            style={inputStyle}
          />
        </div>
        {isSessionMode && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                RIR
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={form.rir}
                onChange={(e) => setForm(prev => ({ ...prev, rir: e.target.value }))}
                className="w-full p-3 rounded-lg text-base"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                Descanso
              </label>
              <input
                type="number"
                min="30"
                step="15"
                value={form.descanso_seg}
                onChange={(e) => setForm(prev => ({ ...prev, descanso_seg: e.target.value }))}
                placeholder="90"
                className="w-full p-3 rounded-lg text-base"
                style={inputStyle}
              />
            </div>
          </>
        )}
      </div>

      {/* Campos opcionales */}
      <div
        className="pt-3 mt-1 border-t space-y-3"
        style={{ borderColor: colors.border }}
      >
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          Opcionales
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              Tempo
            </label>
            <input
              type="text"
              value={form.tempo}
              onChange={(e) => setForm(prev => ({ ...prev, tempo: e.target.value }))}
              placeholder="Ej: 3-1-2-0"
              className="w-full p-3 rounded-lg text-base"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: form.tempo ? colors.textSecondary : colors.border }}>
              Razón
            </label>
            <input
              type="text"
              value={form.tempo_razon}
              onChange={(e) => setForm(prev => ({ ...prev, tempo_razon: e.target.value }))}
              placeholder="Ej: Más tensión"
              className="w-full p-3 rounded-lg text-base"
              style={inputStyle}
              disabled={!form.tempo}
            />
          </div>
        </div>
        <p className="text-xs -mt-2" style={{ color: colors.textSecondary }}>
          Concéntrica - Pausa arriba - Excéntrica - Pausa abajo
        </p>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
            Notas
          </label>
          <input
            type="text"
            value={form.notas}
            onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))}
            placeholder={isSessionMode ? "Notas para este ejercicio..." : "Notas específicas para esta rutina..."}
            className="w-full p-3 rounded-lg text-base"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button
          variant="secondary"
          type="button"
          onClick={onBack}
        >
          Volver
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Añadiendo...' : 'Añadir'}
        </Button>
      </div>
    </form>
  )
}

export default ExerciseConfigForm
