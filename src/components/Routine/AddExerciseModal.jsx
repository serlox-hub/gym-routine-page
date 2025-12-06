import { useState, useMemo, useEffect } from 'react'
import { Search, Plus } from 'lucide-react'
import { Button } from '../ui/index.js'
import { useExercisesWithMuscleGroup, useMuscleGroups, useCreateExercise } from '../../hooks/useExercises.js'
import { colors, modalOverlayStyle, modalContentStyle, inputStyle } from '../../lib/styles.js'
import ExerciseForm from '../Exercise/ExerciseForm.jsx'

/**
 * Modal unificado para añadir ejercicio a rutina o sesión
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Function} onSubmit - Recibe { exerciseId, series, reps, notas, tempo, tempo_razon, rir, descanso_seg }
 * @param {boolean} isPending
 * @param {boolean} isWarmup - Es calentamiento (solo rutina)
 * @param {string} mode - 'routine' | 'session'
 */
function AddExerciseModal({ isOpen, onClose, onSubmit, isPending, isWarmup = false, mode = 'routine' }) {
  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [form, setForm] = useState({
    series: '3',
    reps: '',
    notas: '',
    tempo: '',
    tempo_razon: '',
    rir: '2',
    descanso_seg: '90',
  })

  const isSessionMode = mode === 'session'

  const getDefaultReps = (measurementType) => {
    switch (measurementType) {
      case 'weight_reps':
      case 'reps_only':
        return '8-12'
      case 'reps_per_side':
        return '10/lado'
      case 'time':
        return '30s'
      case 'time_per_side':
        return '30s/lado'
      case 'distance':
        return '40m'
      default:
        return '8-12'
    }
  }

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

  const { data: exercises, isLoading } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const createExercise = useCreateExercise()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedMuscleGroup(null)
      setSelectedExercise(null)
      setIsCreatingNew(false)
      setForm({ series: '3', reps: '', notas: '', tempo: '', tempo_razon: '', rir: '2', descanso_seg: '90' })
    }
  }, [isOpen])

  const filteredExercises = useMemo(() => {
    if (!exercises) return []

    return exercises.filter(ex => {
      const matchesSearch = ex.nombre.toLowerCase().includes(search.toLowerCase())

      if (!selectedMuscleGroup) return matchesSearch

      return matchesSearch && ex.muscle_group_id === selectedMuscleGroup
    })
  }, [exercises, search, selectedMuscleGroup])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedExercise) return

    const data = {
      exerciseId: selectedExercise.id,
      exercise: selectedExercise,
      series: parseInt(form.series) || 3,
      reps: form.reps || getDefaultReps(selectedExercise.measurement_type),
      notas: form.notas || null,
      tempo: form.tempo || null,
      tempo_razon: form.tempo_razon || null,
    }

    if (isSessionMode) {
      data.rir = parseInt(form.rir) || 2
      data.descanso_seg = parseInt(form.descanso_seg) || 90
    }

    onSubmit(data)
  }

  const handleClose = () => {
    onClose()
  }

  const handleCreateExercise = async (exerciseData, muscleGroupId) => {
    try {
      const newExercise = await createExercise.mutateAsync({
        exercise: exerciseData,
        muscleGroupId,
      })

      // Select the newly created exercise
      setSelectedExercise({
        id: newExercise.id,
        nombre: newExercise.nombre,
        measurement_type: newExercise.measurement_type,
      })
      setForm({
        series: '3',
        reps: getDefaultReps(newExercise.measurement_type),
        notas: '',
        tempo: '',
        tempo_razon: '',
        rir: '2',
        descanso_seg: '90',
      })
      setIsCreatingNew(false)
    } catch (err) {
      throw err
    }
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
          {isCreatingNew
            ? 'Nuevo ejercicio'
            : isWarmup
              ? 'Añadir calentamiento'
              : 'Añadir ejercicio'}
        </h3>

        {isCreatingNew ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            <ExerciseForm
              onSubmit={handleCreateExercise}
              isSubmitting={createExercise.isPending}
              submitLabel="Crear ejercicio"
              submitIcon={<Plus size={16} />}
              compact
            />
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="w-full mt-3 py-2 rounded-lg text-sm"
              style={{ color: colors.textSecondary }}
            >
              Cancelar
            </button>
          </div>
        ) : !selectedExercise ? (
          <>
            <div className="relative mb-3">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.textSecondary }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ejercicio..."
                className="w-full p-3 pl-10 rounded-lg text-base"
                style={inputStyle}
                autoFocus
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setSelectedMuscleGroup(null)}
                className="px-3 py-1.5 rounded-full text-sm transition-colors"
                style={{
                  backgroundColor: !selectedMuscleGroup ? colors.accent : 'transparent',
                  color: !selectedMuscleGroup ? '#ffffff' : colors.textSecondary,
                  border: `1px solid ${!selectedMuscleGroup ? colors.accent : colors.border}`,
                }}
              >
                Todos
              </button>
              {muscleGroups?.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedMuscleGroup(group.id)}
                  className="px-3 py-1.5 rounded-full text-sm transition-colors"
                  style={{
                    backgroundColor: selectedMuscleGroup === group.id ? colors.accent : 'transparent',
                    color: selectedMuscleGroup === group.id ? '#ffffff' : colors.textSecondary,
                    border: `1px solid ${selectedMuscleGroup === group.id ? colors.accent : colors.border}`,
                  }}
                >
                  {group.nombre}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {isLoading ? (
                <p className="text-center py-4" style={{ color: colors.textSecondary }}>
                  Cargando...
                </p>
              ) : filteredExercises.length === 0 ? (
                <p className="text-center py-4" style={{ color: colors.textSecondary }}>
                  No se encontraron ejercicios
                </p>
              ) : (
                filteredExercises.map(exercise => (
                  <button
                    key={exercise.id}
                    onClick={() => {
                      setSelectedExercise(exercise)
                      setForm({
                        series: '3',
                        reps: getDefaultReps(exercise.measurement_type),
                        notas: '',
                        tempo: '',
                        tempo_razon: '',
                        rir: '2',
                        descanso_seg: '90',
                      })
                    }}
                    className="w-full text-left p-3 rounded-lg transition-colors hover:bg-surface-alt"
                    style={{ color: colors.textPrimary }}
                  >
                    <div className="font-medium">{exercise.nombre}</div>
                    {exercise.equipment && (
                      <div className="text-sm" style={{ color: colors.textSecondary }}>
                        {exercise.equipment.nombre}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-3 mt-3 border-t" style={{ borderColor: colors.border }}>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: colors.accent,
                  color: '#ffffff',
                }}
              >
                <Plus size={16} />
                Crear nuevo
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: colors.bgTertiary,
                  color: colors.textSecondary,
                }}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(88, 166, 255, 0.1)' }}
            >
              <div className="font-medium" style={{ color: colors.textPrimary }}>
                {selectedExercise.nombre}
              </div>
              {selectedExercise.equipment && (
                <div className="text-sm" style={{ color: colors.textSecondary }}>
                  {selectedExercise.equipment.nombre}
                </div>
              )}
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
                  {getRepsLabel(selectedExercise.measurement_type)} <span style={{ color: colors.danger }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.reps}
                  onChange={(e) => setForm(prev => ({ ...prev, reps: e.target.value }))}
                  placeholder={getRepsPlaceholder(selectedExercise.measurement_type)}
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
                onClick={() => setSelectedExercise(null)}
              >
                Volver
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Añadiendo...' : 'Añadir'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default AddExerciseModal
