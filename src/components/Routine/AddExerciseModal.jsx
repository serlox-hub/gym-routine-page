import { useState, useMemo, useEffect } from 'react'
import { Search, Plus } from 'lucide-react'
import { Button } from '../ui/index.js'
import { useExercisesWithMuscles, useMuscleGroups, useMuscles, useCreateExercise } from '../../hooks/useExercises.js'
import { colors, modalOverlayStyle, modalContentStyle, inputStyle, selectStyle } from '../../lib/styles.js'

const MEASUREMENT_TYPES = [
  { value: 'weight_reps', label: 'Peso × Reps' },
  { value: 'reps_only', label: 'Solo reps' },
  { value: 'reps_per_side', label: 'Reps por lado' },
  { value: 'time', label: 'Tiempo' },
  { value: 'time_per_side', label: 'Tiempo por lado' },
  { value: 'distance', label: 'Distancia' },
]

function AddExerciseModal({ isOpen, onClose, onSubmit, isPending, isWarmup = false }) {
  const [search, setSearch] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newExerciseForm, setNewExerciseForm] = useState({
    nombre: '',
    measurement_type: 'weight_reps',
    muscle_id: '',
  })
  const [form, setForm] = useState({
    series: '3',
    reps: '',
  })

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

  const { data: exercises, isLoading } = useExercisesWithMuscles()
  const { data: muscleGroups } = useMuscleGroups()
  const { data: muscles } = useMuscles()
  const createExercise = useCreateExercise()

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedMuscleGroup(null)
      setSelectedExercise(null)
      setIsCreatingNew(false)
      setNewExerciseForm({ nombre: '', measurement_type: 'weight_reps', muscle_id: '' })
      setForm({ series: '3', reps: '' })
    }
  }, [isOpen])

  // Agrupar músculos por grupo
  const musclesByGroup = useMemo(() => {
    if (!muscles) return {}
    return muscles.reduce((acc, muscle) => {
      const groupName = muscle.muscle_group?.nombre || 'Otros'
      if (!acc[groupName]) acc[groupName] = []
      acc[groupName].push(muscle)
      return acc
    }, {})
  }, [muscles])

  const filteredExercises = useMemo(() => {
    if (!exercises) return []

    return exercises.filter(ex => {
      const matchesSearch = ex.nombre.toLowerCase().includes(search.toLowerCase())

      if (!selectedMuscleGroup) return matchesSearch

      const matchesMuscleGroup = ex.exercise_muscles?.some(em =>
        em.es_principal && em.muscle?.muscle_group?.id === selectedMuscleGroup
      )

      return matchesSearch && matchesMuscleGroup
    })
  }, [exercises, search, selectedMuscleGroup])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedExercise) return

    onSubmit({
      exerciseId: selectedExercise.id,
      series: parseInt(form.series) || 3,
      reps: form.reps || getDefaultReps(selectedExercise.measurement_type),
    })
  }

  const handleClose = () => {
    onClose()
  }

  const handleCreateExercise = async (e) => {
    e.preventDefault()
    if (!newExerciseForm.nombre.trim() || !newExerciseForm.muscle_id) return

    try {
      const newExercise = await createExercise.mutateAsync({
        exercise: {
          nombre: newExerciseForm.nombre.trim(),
          measurement_type: newExerciseForm.measurement_type,
        },
        muscles: [{
          muscle_id: parseInt(newExerciseForm.muscle_id),
          es_principal: true,
        }],
      })

      // Seleccionar el ejercicio recién creado
      setSelectedExercise({
        id: newExercise.id,
        nombre: newExercise.nombre,
        measurement_type: newExercise.measurement_type,
      })
      setForm({
        series: '3',
        reps: getDefaultReps(newExercise.measurement_type),
      })
      setIsCreatingNew(false)
    } catch (err) {
      console.error('Error creating exercise:', err)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={modalOverlayStyle}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg p-6 max-h-[80vh] flex flex-col"
        style={{ ...modalContentStyle, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
          {isWarmup ? 'Añadir calentamiento' : 'Añadir ejercicio'}
        </h3>

        {isCreatingNew ? (
          <form onSubmit={handleCreateExercise} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                Nombre *
              </label>
              <input
                type="text"
                value={newExerciseForm.nombre}
                onChange={(e) => setNewExerciseForm(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Press banca"
                className="w-full p-3 rounded-lg text-base"
                style={inputStyle}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                Tipo de medición
              </label>
              <select
                value={newExerciseForm.measurement_type}
                onChange={(e) => setNewExerciseForm(prev => ({ ...prev, measurement_type: e.target.value }))}
                className="w-full p-3 rounded-lg text-base appearance-none"
                style={selectStyle}
              >
                {MEASUREMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                Músculo principal *
              </label>
              <select
                value={newExerciseForm.muscle_id}
                onChange={(e) => setNewExerciseForm(prev => ({ ...prev, muscle_id: e.target.value }))}
                className="w-full p-3 rounded-lg text-base appearance-none"
                style={selectStyle}
              >
                <option value="">Seleccionar músculo...</option>
                {Object.entries(musclesByGroup).map(([group, groupMuscles]) => (
                  <optgroup key={group} label={group}>
                    {groupMuscles.map(muscle => (
                      <option key={muscle.id} value={muscle.id}>{muscle.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsCreatingNew(false)}
              >
                Volver
              </Button>
              <Button
                type="submit"
                disabled={createExercise.isPending || !newExerciseForm.nombre.trim() || !newExerciseForm.muscle_id}
              >
                {createExercise.isPending ? 'Creando...' : 'Crear y añadir'}
              </Button>
            </div>
          </form>
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

            <div className="flex justify-between pt-4 mt-4 border-t" style={{ borderColor: colors.border }}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setNewExerciseForm({ nombre: search, measurement_type: 'weight_reps', muscle_id: '' })
                  setIsCreatingNew(true)
                }}
              >
                <Plus size={16} className="mr-1" />
                Crear nuevo
              </Button>
              <Button variant="secondary" type="button" onClick={handleClose}>
                Cancelar
              </Button>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                  Series
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
                <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                  {getRepsLabel(selectedExercise.measurement_type)}
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
