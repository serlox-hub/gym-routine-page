import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, X } from 'lucide-react'
import { LoadingSpinner, ErrorMessage, Card } from '../components/ui/index.js'
import {
  useMuscles,
  useEquipment,
  useGripTypes,
  useGripWidths,
  useCreateExercise,
} from '../hooks/useExercises.js'
import { colors, inputStyle, selectStyle } from '../lib/styles.js'

const MEASUREMENT_TYPES = [
  { value: 'weight_reps', label: 'Peso × Reps' },
  { value: 'reps_only', label: 'Solo reps' },
  { value: 'reps_per_side', label: 'Reps por lado' },
  { value: 'time', label: 'Tiempo' },
  { value: 'time_per_side', label: 'Tiempo por lado' },
  { value: 'distance', label: 'Distancia' },
]

const ALTURA_POLEA_OPTIONS = ['Alta', 'Media', 'Baja']

function NewExercise() {
  const navigate = useNavigate()

  const { data: muscles, isLoading: loadingMuscles } = useMuscles()
  const { data: equipment, isLoading: loadingEquipment } = useEquipment()
  const { data: gripTypes, isLoading: loadingGripTypes } = useGripTypes()
  const { data: gripWidths, isLoading: loadingGripWidths } = useGripWidths()
  const createExercise = useCreateExercise()

  const [form, setForm] = useState({
    nombre: '',
    equipment_id: '',
    grip_type_id: '',
    grip_width_id: '',
    altura_polea: '',
    measurement_type: 'weight_reps',
    instrucciones: '',
  })

  const [selectedMuscles, setSelectedMuscles] = useState([])
  const [error, setError] = useState(null)

  const isLoading = loadingMuscles || loadingEquipment || loadingGripTypes || loadingGripWidths

  if (isLoading) return <LoadingSpinner />

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addMuscle = (muscleId, esPrincipal = false) => {
    if (!muscleId) return
    const exists = selectedMuscles.find(m => m.muscle_id === parseInt(muscleId))
    if (exists) return

    const muscle = muscles.find(m => m.id === parseInt(muscleId))
    setSelectedMuscles(prev => [
      ...prev,
      {
        muscle_id: parseInt(muscleId),
        nombre: muscle.nombre,
        es_principal: esPrincipal,
      },
    ])
  }

  const removeMuscle = (muscleId) => {
    setSelectedMuscles(prev => prev.filter(m => m.muscle_id !== muscleId))
  }

  const togglePrincipal = (muscleId) => {
    setSelectedMuscles(prev =>
      prev.map(m =>
        m.muscle_id === muscleId ? { ...m, es_principal: !m.es_principal } : m
      )
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    if (selectedMuscles.length === 0) {
      setError('Selecciona al menos un músculo')
      return
    }

    try {
      await createExercise.mutateAsync({
        exercise: {
          ...form,
          equipment_id: form.equipment_id || null,
          grip_type_id: form.grip_type_id || null,
          grip_width_id: form.grip_width_id || null,
        },
        muscles: selectedMuscles.map(m => ({
          muscle_id: m.muscle_id,
          es_principal: m.es_principal,
        })),
      })
      navigate(-1)
    } catch (err) {
      setError(err.message)
    }
  }

  // Agrupar músculos por grupo
  const musclesByGroup = muscles?.reduce((acc, muscle) => {
    const groupName = muscle.muscle_group?.nombre || 'Otros'
    if (!acc[groupName]) acc[groupName] = []
    acc[groupName].push(muscle)
    return acc
  }, {})

  // Verificar si el equipo seleccionado es polea
  const selectedEquipment = equipment?.find(e => e.id === parseInt(form.equipment_id))
  const isPolea = selectedEquipment?.equipment_type?.nombre === 'Polea'

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <header className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm mb-4 hover:opacity-80"
          style={{ color: colors.accent }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>
        <h1 className="text-2xl font-bold">Nuevo ejercicio</h1>
      </header>

      {error && <ErrorMessage message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Nombre *
          </label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            placeholder="Ej: Press banca"
            className="w-full p-3 rounded-lg text-base"
            style={inputStyle}
          />
        </Card>

        {/* Tipo de medición */}
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Tipo de medición
          </label>
          <select
            value={form.measurement_type}
            onChange={(e) => handleChange('measurement_type', e.target.value)}
            className="w-full p-3 rounded-lg text-base appearance-none"
            style={selectStyle}
          >
            {MEASUREMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </Card>

        {/* Equipamiento */}
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Equipamiento
          </label>
          <select
            value={form.equipment_id}
            onChange={(e) => handleChange('equipment_id', e.target.value)}
            className="w-full p-3 rounded-lg text-base appearance-none"
            style={selectStyle}
          >
            <option value="">Sin equipamiento</option>
            {equipment?.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.nombre}</option>
            ))}
          </select>
        </Card>

        {/* Altura polea (solo si es polea) */}
        {isPolea && (
          <Card className="p-4">
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              Altura de la polea
            </label>
            <div className="flex gap-2">
              {ALTURA_POLEA_OPTIONS.map(altura => (
                <button
                  key={altura}
                  type="button"
                  onClick={() => handleChange('altura_polea', altura)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: form.altura_polea === altura ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
                    color: form.altura_polea === altura ? colors.accent : colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {altura}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Tipo de agarre */}
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Tipo de agarre
          </label>
          <select
            value={form.grip_type_id}
            onChange={(e) => handleChange('grip_type_id', e.target.value)}
            className="w-full p-3 rounded-lg text-base appearance-none"
            style={selectStyle}
          >
            <option value="">N/A</option>
            {gripTypes?.map(gt => (
              <option key={gt.id} value={gt.id}>{gt.nombre}</option>
            ))}
          </select>
        </Card>

        {/* Apertura de agarre */}
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Apertura de agarre
          </label>
          <select
            value={form.grip_width_id}
            onChange={(e) => handleChange('grip_width_id', e.target.value)}
            className="w-full p-3 rounded-lg text-base appearance-none"
            style={selectStyle}
          >
            <option value="">N/A</option>
            {gripWidths?.map(gw => (
              <option key={gw.id} value={gw.id}>{gw.nombre}</option>
            ))}
          </select>
        </Card>

        {/* Músculos */}
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Músculos trabajados *
          </label>

          {/* Músculos seleccionados */}
          {selectedMuscles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedMuscles.map(m => (
                <div
                  key={m.muscle_id}
                  className="flex items-center gap-1 px-2 py-1 rounded text-sm"
                  style={{
                    backgroundColor: m.es_principal ? 'rgba(63, 185, 80, 0.15)' : 'rgba(88, 166, 255, 0.15)',
                    color: m.es_principal ? colors.success : colors.accent,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => togglePrincipal(m.muscle_id)}
                    className="hover:opacity-80"
                    title={m.es_principal ? 'Marcar como secundario' : 'Marcar como principal'}
                  >
                    {m.nombre}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMuscle(m.muscle_id)}
                    className="hover:opacity-80"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs mb-2" style={{ color: colors.textSecondary }}>
            Toca un músculo seleccionado para alternar principal/secundario
          </p>

          {/* Selector de músculos agrupados */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {musclesByGroup && Object.entries(musclesByGroup).map(([group, groupMuscles]) => (
              <div key={group}>
                <p className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>{group}</p>
                <div className="flex flex-wrap gap-1">
                  {groupMuscles.map(muscle => {
                    const isSelected = selectedMuscles.some(m => m.muscle_id === muscle.id)
                    return (
                      <button
                        key={muscle.id}
                        type="button"
                        onClick={() => !isSelected && addMuscle(muscle.id, false)}
                        disabled={isSelected}
                        className="px-2 py-1 rounded text-xs transition-colors"
                        style={{
                          backgroundColor: isSelected ? colors.border : colors.bgTertiary,
                          color: isSelected ? colors.textSecondary : colors.textPrimary,
                          opacity: isSelected ? 0.5 : 1,
                        }}
                      >
                        {muscle.nombre}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Instrucciones */}
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Instrucciones
          </label>
          <textarea
            value={form.instrucciones}
            onChange={(e) => handleChange('instrucciones', e.target.value)}
            placeholder="Notas sobre la ejecución del ejercicio..."
            rows={3}
            className="w-full p-3 rounded-lg text-base resize-none"
            style={inputStyle}
          />
        </Card>

        {/* Botón guardar */}
        <button
          type="submit"
          disabled={createExercise.isPending}
          className="w-full py-4 rounded-lg font-medium text-lg transition-colors flex items-center justify-center gap-2"
          style={{
            backgroundColor: colors.success,
            color: '#ffffff',
            opacity: createExercise.isPending ? 0.7 : 1,
          }}
        >
          {createExercise.isPending ? (
            'Guardando...'
          ) : (
            <>
              <Plus size={20} />
              Crear ejercicio
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default NewExercise
