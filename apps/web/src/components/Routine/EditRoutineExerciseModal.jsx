import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { getNextSupersetId, parseExerciseConfigForm } from '@gym/shared'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm.jsx'
import ExercisePickerModal from './ExercisePickerModal.jsx'
import { ExerciseFormPanel } from '../Exercise/index.js'

function ViewToggle({ view, onChangeView, labels }) {
  return (
    <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
      {labels.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChangeView(key)}
          className="flex-1 py-1.5 text-xs font-semibold transition-colors"
          style={view === key ? { backgroundColor: colors.accent, color: colors.white } : { color: colors.textSecondary }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function EditRoutineExerciseModal({ isOpen, onClose, onSubmit, isPending, routineExercise, existingSupersets = [], isReplacing = false }) {
  const { t } = useTranslation()
  const [view, setView] = useState('config')
  const [form, setForm] = useState({
    series: '3', reps: '', rir: '', rest_seconds: '', notes: '', superset_group: '',
  })

  const exercise = routineExercise?.exercise

  useEffect(() => {
    if (routineExercise) {
      setView('config')
      setForm({
        series: String(routineExercise.series || 3),
        reps: routineExercise.reps || '',
        rir: routineExercise.rir != null ? String(routineExercise.rir) : '',
        rest_seconds: routineExercise.rest_seconds ? String(routineExercise.rest_seconds) : '',
        notes: routineExercise.notes || '',
        superset_group: routineExercise.superset_group != null
          ? String(routineExercise.superset_group)
          : '',
      })
    }
  }, [routineExercise])

  if (!routineExercise) return null

  const handleSubmit = () => {
    onSubmit({ exerciseId: routineExercise.id, ...parseExerciseConfigForm(form) })
  }

  const handleReplace = (newExercise) => {
    const replaceForm = { ...form, rir: '', notes: '' }
    onSubmit({ exerciseId: routineExercise.id, exercise_id: newExercise.id, ...parseExerciseConfigForm(replaceForm) })
  }

  const nextSuperset = getNextSupersetId(existingSupersets)

  if (isReplacing) {
    return (
      <ExercisePickerModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleReplace}
        title={t('routine:exercise.replace')}
        subtitle={`${t('routine:exercise.replacing')}: ${exercise?.name}`}
        initialMuscleGroup={exercise?.muscle_group?.id}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="center" maxWidth="max-w-md">
      <div className="p-4 space-y-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <p className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {exercise?.name || t('exercise:title')}
        </p>
        <ViewToggle
          view={view}
          onChangeView={setView}
          labels={[{ key: 'config', label: t('routine:exercise.config') }, { key: 'exercise', label: t('exercise:details') }]}
        />
      </div>

      {view === 'config' ? (
        <div className="p-4">
          <ExerciseConfigForm
            exercise={exercise}
            form={form}
            setForm={setForm}
            showSupersetField
            hideExerciseName
            existingSupersets={existingSupersets}
            nextSupersetId={nextSuperset}
          />
          <ExerciseConfigFormButtons
            onBack={onClose}
            onSubmit={handleSubmit}
            isPending={isPending}
            backLabel={t('common:buttons.cancel')}
            submitLabel={t('common:buttons.save')}
            pendingLabel={t('common:buttons.loading')}
          />
        </div>
      ) : (
        <ExerciseFormPanel
          exerciseId={exercise?.id}
          isSystem={exercise?.is_system}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}

export default EditRoutineExerciseModal
