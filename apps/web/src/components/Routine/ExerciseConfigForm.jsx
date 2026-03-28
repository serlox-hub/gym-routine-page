import { Button, Input, Select } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { formatSupersetLabel, getRepsLabel, getRepsPlaceholder } from '@gym/shared'

/**
 * Formulario para configurar series, reps, tempo, notas de un ejercicio
 * Reutilizable para añadir y editar ejercicios en rutinas/sesiones
 */
function ExerciseConfigForm({
  exercise,
  form,
  setForm,
  isSessionMode = false,
  existingSupersets = [],
  nextSupersetId = 1,
  showSupersetField = false,
  hideExerciseName = false,
}) {
  return (
    <div className="space-y-4">
      {!hideExerciseName && (
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'rgba(88, 166, 255, 0.1)' }}
        >
          <div className="font-medium" style={{ color: colors.textPrimary }}>
            {exercise.name}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={isSessionMode ? 'Series' : <>Series <span style={{ color: colors.danger }}>*</span></>}
          type="number"
          min="1"
          value={form.series}
          onChange={(e) => setForm(prev => ({ ...prev, series: e.target.value }))}
        />
        <Input
          label={isSessionMode ? getRepsLabel(exercise.measurement_type) : <>{getRepsLabel(exercise.measurement_type)} <span style={{ color: colors.danger }}>*</span></>}
          type="text"
          value={form.reps}
          onChange={(e) => setForm(prev => ({ ...prev, reps: e.target.value }))}
          placeholder={getRepsPlaceholder(exercise.measurement_type)}
        />
      </div>

      <div
        className={`space-y-3 ${isSessionMode ? '' : 'pt-3 mt-1 border-t'}`}
        style={isSessionMode ? undefined : { borderColor: colors.border }}
      >
        {!isSessionMode && (
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            Opcionales
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="RIR"
            type="number"
            min="0"
            max="5"
            value={form.rir}
            onChange={(e) => setForm(prev => ({ ...prev, rir: e.target.value }))}
            placeholder="Ej: 2"
          />
          <Input
            label="Descanso (seg)"
            type="number"
            min="0"
            value={form.rest_seconds}
            onChange={(e) => setForm(prev => ({ ...prev, rest_seconds: e.target.value }))}
            placeholder="Ej: 90"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Tempo"
            type="text"
            value={form.tempo}
            onChange={(e) => setForm(prev => ({ ...prev, tempo: e.target.value }))}
            placeholder="Ej: 3-1-2-0"
          />
          <Input
            label="Razón"
            type="text"
            value={form.tempo_razon}
            onChange={(e) => setForm(prev => ({ ...prev, tempo_razon: e.target.value }))}
            placeholder="Ej: Más tensión"
            disabled={!form.tempo}
          />
        </div>
        <p className="text-xs -mt-2" style={{ color: colors.textSecondary }}>
          Concéntrica - Pausa arriba - Excéntrica - Pausa abajo
        </p>

        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: colors.textSecondary }}>Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder={isSessionMode ? "Notas para este ejercicio..." : "Notas específicas para esta rutina..."}
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}`, resize: 'vertical' }}
          />
        </div>

        {showSupersetField && (
          <div>
            <Select
              label="Superset"
              value={form.superset_group || ''}
              onChange={(e) => setForm(prev => ({ ...prev, superset_group: e.target.value }))}
            >
              <option value="">Sin superset</option>
              {existingSupersets.map(id => (
                <option key={id} value={id}>
                  {formatSupersetLabel(id)}
                </option>
              ))}
              <option value={nextSupersetId}>
                + Nuevo {formatSupersetLabel(nextSupersetId)}
              </option>
            </Select>
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              Ejercicios en el mismo superset se hacen sin descanso entre ellos
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export function ExerciseConfigFormButtons({ onBack, onSubmit, isPending, backLabel = 'Volver', submitLabel = 'Añadir', pendingLabel = 'Añadiendo...' }) {
  return (
    <div className="flex gap-3 justify-end pt-3 border-t flex-shrink-0" style={{ borderColor: colors.border }}>
      <Button
        variant="secondary"
        type="button"
        onClick={onBack}
      >
        {backLabel}
      </Button>
      <Button onClick={onSubmit} disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </div>
  )
}

export default ExerciseConfigForm
