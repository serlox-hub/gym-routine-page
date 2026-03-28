import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, diffSessionExerciseFields } from '@gym/shared'
import { Modal } from '../ui/index.js'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm.jsx'
import { ExerciseFormPanel } from '../Exercise/index.js'
import { colors } from '../../lib/styles.js'
import useWorkoutStore from '../../stores/workoutStore.js'

function ViewToggle({ view, onChangeView }) {
  return (
    <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
      <button
        onClick={() => onChangeView('session')}
        className="flex-1 py-1.5 text-xs font-semibold transition-colors"
        style={view === 'session' ? { backgroundColor: colors.accent, color: colors.white } : { color: colors.textSecondary }}
      >
        En sesión
      </button>
      <button
        onClick={() => onChangeView('exercise')}
        className="flex-1 py-1.5 text-xs font-semibold transition-colors"
        style={view === 'exercise' ? { backgroundColor: colors.accent, color: colors.white } : { color: colors.textSecondary }}
      >
        Ficha
      </button>
    </div>
  )
}

const DEFAULT_FORM = {
  series: '3', reps: '', rir: '', rest_seconds: '', notes: '', tempo: '', tempo_razon: '', superset_group: '',
}

export default function EditSessionExerciseModal({
  isOpen,
  onClose,
  onSave,
  sessionExercise,
  existingSupersets = [],
}) {
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const [view, setView] = useState('session')
  const [form, setForm] = useState(DEFAULT_FORM)

  const exerciseId = sessionExercise?.exercise?.id || sessionExercise?.exercise_id

  useEffect(() => {
    if (isOpen && sessionExercise) {
      setView('session')
      setForm({
        series: String(sessionExercise.series ?? 3),
        reps: sessionExercise.reps ?? '',
        rir: sessionExercise.rir != null ? String(sessionExercise.rir) : '',
        rest_seconds: sessionExercise.rest_seconds ? String(sessionExercise.rest_seconds) : '',
        notes: sessionExercise.notes ?? '',
        tempo: sessionExercise.tempo ?? '',
        tempo_razon: '',
        superset_group: sessionExercise.superset_group != null ? String(sessionExercise.superset_group) : '',
      })
    }
  }, [isOpen, sessionExercise])

  const handleSave = () => {
    const { fields, newSeries } = diffSessionExerciseFields(
      { series: form.series, reps: form.reps, rir: form.rir, restSeconds: form.rest_seconds, tempo: form.tempo, notes: form.notes, supersetGroup: form.superset_group },
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

  const exerciseName = sessionExercise.exercise?.name || 'Ejercicio'
  const exerciseObj = sessionExercise.exercise || {}

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="center" maxWidth="max-w-md">
      <div className="p-4 space-y-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <p className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {exerciseName}
        </p>
        <ViewToggle view={view} onChangeView={setView} />
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
          />
          <ExerciseConfigFormButtons
            onBack={onClose}
            onSubmit={handleSave}
            backLabel="Cancelar"
            submitLabel="Guardar"
            pendingLabel="Guardando..."
          />
        </div>
      ) : (
        <ExerciseFormPanel
          exerciseId={exerciseId}
          onClose={onClose}
          onSaveSuccess={handleExerciseSaved}
        />
      )}
    </Modal>
  )
}
