import { useState, useEffect } from 'react'
import { Card } from '../ui/index.js'
import {
  useMuscleGroups,
  useEquipment,
  useGripTypes,
  useGripWidths,
} from '../../hooks/useExercises.js'
import { colors, inputStyle, selectStyle } from '../../lib/styles.js'

const MEASUREMENT_TYPES = [
  { value: 'weight_reps', label: 'Peso × Reps' },
  { value: 'reps_only', label: 'Solo reps' },
  { value: 'reps_per_side', label: 'Reps por lado' },
  { value: 'time', label: 'Tiempo' },
  { value: 'time_per_side', label: 'Tiempo por lado' },
  { value: 'distance', label: 'Distancia' },
]

const ALTURA_POLEA_OPTIONS = ['Alta', 'Media', 'Baja']

const DEFAULT_FORM = {
  nombre: '',
  equipment_id: '',
  grip_type_id: '',
  grip_width_id: '',
  altura_polea: '',
  measurement_type: 'weight_reps',
  instrucciones: '',
}

/**
 * Reusable exercise form component
 * @param {Object} props
 * @param {Object} props.initialData - Initial exercise data for editing (includes muscle_group_id)
 * @param {Function} props.onSubmit - Called with (formData, muscleGroupId) when form is valid
 * @param {boolean} props.isSubmitting - Show loading state on submit button
 * @param {string} props.submitLabel - Label for submit button
 * @param {React.ReactNode} props.submitIcon - Icon for submit button
 * @param {boolean} props.compact - Use compact mode (no Card wrappers, for modals)
 * @param {string} props.className - Additional class names
 */
function ExerciseForm({
  initialData = null,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Guardar',
  submitIcon = null,
  compact = false,
  className = '',
}) {
  const { data: muscleGroups, isLoading: loadingMuscleGroups } = useMuscleGroups()
  const { data: equipment, isLoading: loadingEquipment } = useEquipment()
  const { data: gripTypes, isLoading: loadingGripTypes } = useGripTypes()
  const { data: gripWidths, isLoading: loadingGripWidths } = useGripWidths()

  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState(null)
  const [error, setError] = useState(null)

  const isLoading = loadingMuscleGroups || loadingEquipment || loadingGripTypes || loadingGripWidths

  // Populate form with initial data
  useEffect(() => {
    if (initialData) {
      setForm({
        nombre: initialData.nombre || '',
        equipment_id: initialData.equipment_id || '',
        grip_type_id: initialData.grip_type_id || '',
        grip_width_id: initialData.grip_width_id || '',
        altura_polea: initialData.altura_polea || '',
        measurement_type: initialData.measurement_type || 'weight_reps',
        instrucciones: initialData.instrucciones || '',
      })
      setSelectedMuscleGroupId(initialData.muscle_group_id || null)
    }
  }, [initialData])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    if (!selectedMuscleGroupId) {
      setError('Selecciona un grupo muscular')
      return
    }

    const exerciseData = {
      ...form,
      equipment_id: form.equipment_id || null,
      grip_type_id: form.grip_type_id || null,
      grip_width_id: form.grip_width_id || null,
    }

    onSubmit(exerciseData, selectedMuscleGroupId)
  }

  // Check if selected equipment is a pulley
  const selectedEquipment = equipment?.find(e => e.id === parseInt(form.equipment_id))
  const isPolea = selectedEquipment?.equipment_type?.nombre === 'Polea'

  // Wrapper component based on compact mode
  const Wrapper = compact ? 'div' : Card

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p style={{ color: colors.textSecondary }}>Cargando...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)', color: colors.danger }}
        >
          {error}
        </div>
      )}

      {/* === CAMPOS OBLIGATORIOS === */}

      {/* Nombre */}
      <Wrapper className={compact ? '' : 'p-4'}>
        <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
          Nombre <span style={{ color: colors.danger }}>*</span>
        </label>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => handleChange('nombre', e.target.value)}
          placeholder="Ej: Press banca"
          className="w-full p-3 rounded-lg text-base"
          style={inputStyle}
        />
      </Wrapper>

      {/* Tipo de medición */}
      <Wrapper className={compact ? '' : 'p-4'}>
        <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
          Tipo de medición <span style={{ color: colors.danger }}>*</span>
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
      </Wrapper>

      {/* Grupo muscular */}
      <Wrapper className={compact ? '' : 'p-4'}>
        <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
          Grupo muscular <span style={{ color: colors.danger }}>*</span>
        </label>

        <div className="flex flex-wrap gap-2">
          {muscleGroups?.map(group => {
            const isSelected = selectedMuscleGroupId === group.id
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedMuscleGroupId(group.id)}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: isSelected ? 'rgba(63, 185, 80, 0.15)' : colors.bgTertiary,
                  color: isSelected ? colors.success : colors.textPrimary,
                  border: isSelected ? `1px solid ${colors.success}` : `1px solid ${colors.border}`,
                }}
              >
                {group.nombre}
              </button>
            )
          })}
        </div>
      </Wrapper>

      {/* === CAMPOS OPCIONALES === */}
      <div
        className="pt-4 mt-2 border-t"
        style={{ borderColor: colors.border }}
      >
        <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>
          Campos opcionales
        </p>

        {/* Equipamiento */}
        <Wrapper className={compact ? 'mb-4' : 'p-4 mb-4'}>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
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
        </Wrapper>

        {/* Altura polea (solo si es polea) */}
        {isPolea && (
          <Wrapper className={compact ? 'mb-4' : 'p-4 mb-4'}>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
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
          </Wrapper>
        )}

        {/* Tipo de agarre */}
        <Wrapper className={compact ? 'mb-4' : 'p-4 mb-4'}>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
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
        </Wrapper>

        {/* Apertura de agarre */}
        <Wrapper className={compact ? 'mb-4' : 'p-4 mb-4'}>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
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
        </Wrapper>

        {/* Instrucciones */}
        <Wrapper className={compact ? '' : 'p-4'}>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            Instrucciones de ejecución
          </label>
          <textarea
            value={form.instrucciones}
            onChange={(e) => handleChange('instrucciones', e.target.value)}
            placeholder="Cómo ejecutar el ejercicio correctamente..."
            rows={3}
            className="w-full p-3 rounded-lg text-base resize-none"
            style={inputStyle}
          />
        </Wrapper>
      </div>

      {/* Botón guardar */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 rounded-lg font-medium text-lg transition-colors flex items-center justify-center gap-2"
        style={{
          backgroundColor: colors.success,
          color: '#ffffff',
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        {isSubmitting ? (
          'Guardando...'
        ) : (
          <>
            {submitIcon}
            {submitLabel}
          </>
        )}
      </button>
    </form>
  )
}

export default ExerciseForm
