import { useTranslation } from 'react-i18next'
import { Button, Input, Select } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { formatSupersetLabel, getRepsLabel, getRepsPlaceholder } from '@gym/shared'

/**
 * Formulario para configurar series, reps, notas de un ejercicio
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
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {!hideExerciseName && (
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: colors.accentBgSubtle }}
        >
          <div className="font-medium" style={{ color: colors.textPrimary }}>
            {exercise.name}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={isSessionMode ? t('routine:exercise.series') : <>{t('routine:exercise.series')} <span style={{ color: colors.danger }}>*</span></>}
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
            {t('common:labels.optional')}
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
            label={t('routine:exercise.rest')}
            type="number"
            min="0"
            value={form.rest_seconds}
            onChange={(e) => setForm(prev => ({ ...prev, rest_seconds: e.target.value }))}
            placeholder="Ej: 90"
          />
        </div>

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
              label="Superset"
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
