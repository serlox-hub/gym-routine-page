import { useState, useEffect } from 'react'
import { Button } from '../ui/index.js'
import { colors, modalOverlayStyle, modalContentStyle, inputStyle } from '../../lib/styles.js'

function EditRoutineExerciseModal({ isOpen, onClose, onSubmit, isPending, routineExercise }) {
  const [form, setForm] = useState({
    series: '3',
    reps: '',
    notas: '',
    tempo: '',
    tempo_razon: '',
  })

  const exercise = routineExercise?.exercise

  const getRepsLabel = (measurementType) => {
    switch (measurementType) {
      case 'weight_reps':
      case 'reps_only':
        return 'Repeticiones'
      case 'reps_per_side':
        return 'Reps por lado'
      case 'time':
        return 'Tiempo'
      case 'time_per_side':
        return 'Tiempo por lado'
      case 'distance':
        return 'Distancia'
      default:
        return 'Repeticiones'
    }
  }

  const getRepsPlaceholder = (measurementType) => {
    switch (measurementType) {
      case 'weight_reps':
      case 'reps_only':
        return 'Ej: 8-12'
      case 'reps_per_side':
        return 'Ej: 10/lado'
      case 'time':
        return 'Ej: 30s, 1min'
      case 'time_per_side':
        return 'Ej: 30s/lado'
      case 'distance':
        return 'Ej: 40m'
      default:
        return 'Ej: 8-12'
    }
  }

  // Populate form when routineExercise changes
  useEffect(() => {
    if (routineExercise) {
      setForm({
        series: String(routineExercise.series || 3),
        reps: routineExercise.reps || '',
        notas: routineExercise.notas || '',
        tempo: routineExercise.tempo || '',
        tempo_razon: routineExercise.tempo_razon || '',
      })
    }
  }, [routineExercise])

  if (!isOpen || !routineExercise) return null

  const measurementType = routineExercise.measurement_type || exercise?.measurement_type || 'weight_reps'

  const handleSubmit = (e) => {
    e.preventDefault()

    onSubmit({
      exerciseId: routineExercise.id,
      series: parseInt(form.series) || 3,
      reps: form.reps || '8-12',
      notas: form.notas || null,
      tempo: form.tempo || null,
      tempo_razon: form.tempo_razon || null,
    })
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={modalOverlayStyle}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg p-6 max-h-[85vh] flex flex-col"
        style={{ ...modalContentStyle, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
          Editar ejercicio
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ejercicio (solo lectura) */}
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(88, 166, 255, 0.1)' }}
          >
            <div className="font-medium" style={{ color: colors.textPrimary }}>
              {exercise?.nombre}
            </div>
          </div>

          {/* Campos obligatorios */}
          <div className="grid grid-cols-2 gap-3">
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
                {getRepsLabel(measurementType)} <span style={{ color: colors.danger }}>*</span>
              </label>
              <input
                type="text"
                value={form.reps}
                onChange={(e) => setForm(prev => ({ ...prev, reps: e.target.value }))}
                placeholder={getRepsPlaceholder(measurementType)}
                className="w-full p-3 rounded-lg text-base"
                style={inputStyle}
              />
            </div>
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
                placeholder="Notas específicas para esta rutina..."
                className="w-full p-3 rounded-lg text-base"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditRoutineExerciseModal
