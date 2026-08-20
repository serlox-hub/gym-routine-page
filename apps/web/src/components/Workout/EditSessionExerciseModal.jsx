import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, buildExerciseConfigForm, buildExerciseConfigFormFromRow, diffSessionExerciseFields, validateExerciseConfigForm, resolveTrackedFields } from '@gym/shared'
import { Modal } from '../ui/index.js'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm.jsx'
import { ExerciseFormPanel } from '../Exercise/index.js'
import { colors } from '../../lib/styles.js'
import useWorkoutStore from '../../stores/workoutStore.js'

function ViewToggle({ view, onChangeView, labels }) {
  return (
    <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
      {labels.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChangeView(key)}
          className="flex-1 py-1.5 text-xs font-semibold transition-colors"
          style={view === key ? { backgroundColor: colors.success, color: colors.textDark } : { color: colors.textSecondary }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default function EditSessionExerciseModal({
  isOpen,
  onClose,
  onSave,
  sessionExercise,
  existingSupersets = [],
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const [view, setView] = useState('session')
  const [form, setForm] = useState(() => buildExerciseConfigForm())
  const [errors, setErrors] = useState({})

  const exerciseId = sessionExercise?.exercise?.id || sessionExercise?.exercise_id

  useEffect(() => {
    if (isOpen && sessionExercise) {
      setView('session')
      setErrors({})
      setForm(buildExerciseConfigFormFromRow(sessionExercise, resolveTrackedFields(sessionExercise.exercise)))
    }
  }, [isOpen, sessionExercise])

  const handleSave = () => {
    const { valid, errors: formErrors } = validateExerciseConfigForm(form, resolveTrackedFields(sessionExercise?.exercise))
    setErrors(formErrors)
    if (!valid) return
    const { fields, newSeries } = diffSessionExerciseFields(
      { series: form.series, targetField: form.target_field, reps: form.reps, level: form.level, rir: form.rir, restSeconds: form.rest_seconds, notes: form.notes, supersetGroup: form.superset_group },
      sessionExercise,
    )
    if (Object.keys(fields).length > 0) {
      onSave(sessionExercise.sessionExerciseId || sessionExercise.id, fields, newSeries)
    }
    onClose()
  }

  const handleExerciseSaved = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
  }

  if (!sessionExercise) return null

  const exerciseName = sessionExercise.exercise?.name || t('exercise:title')
  const exerciseObj = sessionExercise.exercise || {}

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="center" maxWidth="max-w-md">
      <div className="p-4 space-y-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <p className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {exerciseName}
        </p>
        <ViewToggle view={view} onChangeView={setView} labels={[{ key: 'session', label: t('routine:exercise.config') }, { key: 'exercise', label: t('exercise:details') }]} />
      </div>

      {view === 'session' ? (
        <div className="p-4">
          <ExerciseConfigForm
            exercise={exerciseObj}
            form={form}
            setForm={setForm}
            isSessionMode
            hideExerciseName
            showSupersetField={existingSupersets.length > 0}
            existingSupersets={existingSupersets}
            errors={errors}
          />
          <ExerciseConfigFormButtons
            onBack={onClose}
            onSubmit={handleSave}
            backLabel={t('common:buttons.cancel')}
            submitLabel={t('common:buttons.save')}
            pendingLabel={t('common:buttons.loading')}
          />
        </div>
      ) : (
        <ExerciseFormPanel
          exerciseId={exerciseId}
          isSystem={sessionExercise?.exercise?.is_system}
          onClose={onClose}
          onSaveSuccess={handleExerciseSaved}
        />
      )}
    </Modal>
  )
}
