import { useState, useEffect } from 'react'
import { colors, modalOverlayStyle, modalContentStyle } from '../../lib/styles.js'
import { getNextSupersetId } from '../../lib/supersetUtils.js'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm.jsx'

function EditRoutineExerciseModal({ isOpen, onClose, onSubmit, isPending, routineExercise, existingSupersets = [] }) {
  const [form, setForm] = useState({
    series: '3',
    reps: '',
    rir: '',
    rest_seconds: '',
    notes: '',
    tempo: '',
    tempo_razon: '',
    superset_group: '',
  })

  const exercise = routineExercise?.exercise

  // Populate form when routineExercise changes
  useEffect(() => {
    if (routineExercise) {
      setForm({
        series: String(routineExercise.series || 3),
        reps: routineExercise.reps || '',
        rir: routineExercise.rir !== null && routineExercise.rir !== undefined ? String(routineExercise.rir) : '',
        rest_seconds: routineExercise.rest_seconds ? String(routineExercise.rest_seconds) : '',
        notes: routineExercise.notes || '',
        tempo: routineExercise.tempo || '',
        tempo_razon: routineExercise.tempo_razon || '',
        superset_group: routineExercise.superset_group !== null && routineExercise.superset_group !== undefined
          ? String(routineExercise.superset_group)
          : '',
      })
    }
  }, [routineExercise])

  if (!isOpen || !routineExercise) return null

  const handleSubmit = () => {
    onSubmit({
      exerciseId: routineExercise.id,
      series: parseInt(form.series) || 3,
      reps: form.reps || '8-12',
      rir: form.rir !== '' ? parseInt(form.rir) : null,
      rest_seconds: form.rest_seconds ? parseInt(form.rest_seconds) : null,
      notes: form.notes || null,
      tempo: form.tempo || null,
      tempo_razon: form.tempo_razon || null,
      superset_group: form.superset_group !== '' ? parseInt(form.superset_group) : null,
    })
  }

  const nextSuperset = getNextSupersetId(existingSupersets)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={modalOverlayStyle}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg p-6 max-h-[85vh] flex flex-col"
        style={{ ...modalContentStyle, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
          Editar ejercicio
        </h3>

        <div className="flex-1 overflow-y-auto min-h-0">
          <ExerciseConfigForm
            exercise={exercise}
            form={form}
            setForm={setForm}
            showSupersetField={true}
            existingSupersets={existingSupersets}
            nextSupersetId={nextSuperset}
          />
        </div>
        <ExerciseConfigFormButtons
          onBack={onClose}
          onSubmit={handleSubmit}
          isPending={isPending}
          backLabel="Cancelar"
          submitLabel="Guardar"
          pendingLabel="Guardando..."
        />
      </div>
    </div>
  )
}

export default EditRoutineExerciseModal
