import { useTranslation } from 'react-i18next'
import { Button, Input, Select } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import {
  buildTargetFieldChangeForm,
  formatSupersetLabel,
  getEffortLabel,
  getEffortOptions,
  getTargetLabel,
  getTargetPlaceholder,
  getTargetableFields,
  getExerciseName,
  MAX_PRESCRIBED_LEVEL,
  resolveTargetField,
  resolveTrackedFields,
  tracksLevel,
} from '@gym/shared'

/**
 * Formulario para configurar series, objetivo, esfuerzo y notas de un ejercicio.
 * Reutilizable para añadir y editar ejercicios en rutinas/sesiones.
 *
 * Los campos se adaptan al `tracked_fields`: el objetivo se prescribe sobre el campo que ELIGE el
 * usuario (selector «Objetivo en», solo cuando el ejercicio mide más de uno prescribible) y el
 * esfuerzo cambia de escala (RIR con reps, RPE sin ellas). Los ejercicios que miden nivel pueden
 * además prescribirlo, que es lo que hace que la progresión de un cardio tenga sentido (el nivel
 * juega el papel del peso). `series` aplica a todos: define cuántas filas se registran en la sesión.
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
  errors = {},
}) {
  const { t } = useTranslation()
  const trackedFields = resolveTrackedFields(exercise)
  const effortLabel = getEffortLabel(trackedFields)
  const targetField = resolveTargetField(form.target_field, trackedFields)
  const targetableFields = getTargetableFields(trackedFields)
  const showLevel = tracksLevel(trackedFields)
  // Con más de un campo prescribible se pregunta PRIMERO de qué campo habla el objetivo (fila de
  // arriba, junto a series) y el valor baja a la fila siguiente: se elige y luego se escribe. Con
  // uno solo no hay nada que elegir y el valor ocupa ese hueco, como siempre.
  const hasTargetFieldChoice = targetableFields.length > 1

  const targetValueInput = (
    <Input
      label={<>{getTargetLabel(targetField)} <span style={{ color: colors.danger }}>*</span></>}
      type="text"
      value={form.reps}
      onChange={(e) => setForm(prev => ({ ...prev, reps: e.target.value }))}
      placeholder={getTargetPlaceholder(targetField, trackedFields)}
      error={errors.reps}
    />
  )

  return (
    <div className="space-y-4">
      {!hideExerciseName && (
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <div className="font-medium" style={{ color: colors.textPrimary }}>
            {getExerciseName(exercise)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={<>{t('routine:exercise.series')} <span style={{ color: colors.danger }}>*</span></>}
          type="number"
          min="1"
          value={form.series}
          onChange={(e) => setForm(prev => ({ ...prev, series: e.target.value }))}
          error={errors.series}
        />
        {hasTargetFieldChoice ? (
          // Cambiar de campo resetea el valor (buildTargetFieldChangeForm): "8-12" en un objetivo
          // de tiempo serían 8-12 segundos.
          <Select
            label={t('routine:exercise.targetField')}
            value={targetField ?? ''}
            onChange={(e) => setForm(prev => buildTargetFieldChangeForm(prev, e.target.value, trackedFields))}
          >
            {targetableFields.map(field => (
              <option key={field} value={field}>{getTargetLabel(field)}</option>
            ))}
          </Select>
        ) : targetValueInput}
      </div>

      {hasTargetFieldChoice && (
        <div className="grid grid-cols-2 gap-3">{targetValueInput}</div>
      )}

      <div
        className={`space-y-3 ${isSessionMode ? '' : 'pt-3 mt-1 border-t'}`}
        style={isSessionMode ? undefined : { borderColor: colors.border }}
      >
        {!isSessionMode && (
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            {t('common:labels.optional')}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={effortLabel}
            value={form.rir}
            onChange={(e) => setForm(prev => ({ ...prev, rir: e.target.value }))}
            error={errors.rir}
          >
            <option value="">{t('common:labels.none')}</option>
            {getEffortOptions(trackedFields).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
          <Input
            label={t('routine:exercise.rest')}
            type="number"
            min="0"
            value={form.rest_seconds}
            onChange={(e) => setForm(prev => ({ ...prev, rest_seconds: e.target.value }))}
            placeholder={t('routine:exercise.restPlaceholder')}
            error={errors.rest_seconds}
          />
        </div>

        {/* Nivel de la máquina: no es un resultado, es un ajuste que pones antes de empezar, y
            hasta ahora solo cabía en las notas. */}
        {showLevel && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('routine:exercise.level')}
              type="number"
              min="0"
              max={MAX_PRESCRIBED_LEVEL}
              step="1"
              value={form.level}
              onChange={(e) => setForm(prev => ({ ...prev, level: e.target.value }))}
              placeholder={t('routine:exercise.levelPlaceholder')}
              error={errors.level}
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: colors.textSecondary }}>{t('routine:exercise.notes')}</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder={t('routine:exercise.notesPlaceholder')}
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}`, resize: 'vertical' }}
          />
        </div>

        {showSupersetField && (
          <div>
            <Select
              label={t('routine:superset.title')}
              value={form.superset_group || ''}
              onChange={(e) => setForm(prev => ({ ...prev, superset_group: e.target.value }))}
            >
              <option value="">{t('routine:superset.noSuperset')}</option>
              {existingSupersets.map(id => (
                <option key={id} value={id}>
                  {formatSupersetLabel(id)}
                </option>
              ))}
              <option value={nextSupersetId}>
                + {t('common:labels.new')} {formatSupersetLabel(nextSupersetId)}
              </option>
            </Select>
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {t('routine:superset.description')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export function ExerciseConfigFormButtons({ onBack, onSubmit, isPending, backLabel, submitLabel, pendingLabel }) {
  const { t } = useTranslation()
  const _backLabel = backLabel || t('common:buttons.back')
  const _submitLabel = submitLabel || t('common:buttons.add')
  const _pendingLabel = pendingLabel || t('common:buttons.loading')
  return (
    <div className="flex gap-3 justify-end pt-3 border-t flex-shrink-0" style={{ borderColor: colors.border }}>
      <Button
        variant="secondary"
        type="button"
        onClick={onBack}
      >
        {_backLabel}
      </Button>
      <Button onClick={onSubmit} disabled={isPending}>
        {isPending ? _pendingLabel : _submitLabel}
      </Button>
    </div>
  )
}

export default ExerciseConfigForm
