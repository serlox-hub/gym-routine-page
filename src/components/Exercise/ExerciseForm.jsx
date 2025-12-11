import { useState, useEffect } from 'react'
import { Card, BottomActions } from '../ui/index.js'
import { useMuscleGroups } from '../../hooks/useExercises.js'
import { colors, inputStyle, selectStyle } from '../../lib/styles.js'
import { MEASUREMENT_TYPE_OPTIONS, measurementTypeUsesWeight } from '../../lib/measurementTypes.js'

const WEIGHT_UNITS = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'lb', label: 'Libras (lb)' },
]

const DEFAULT_FORM = {
  name: '',
  measurement_type: 'weight_reps',
  weight_unit: 'kg',
  instructions: '',
}

/**
 * Reusable exercise form component
 * @param {Object} props
 * @param {Object} props.initialData - Initial exercise data for editing (includes muscle_group_id)
 * @param {Function} props.onSubmit - Called with (formData, muscleGroupId) when form is valid
 * @param {boolean} props.isSubmitting - Show loading state on submit button
 * @param {string} props.submitLabel - Label for submit button
 * @param {boolean} props.compact - Use compact mode (no Card wrappers, for modals)
 * @param {boolean} props.hideSubmitButton - Hide internal submit button (for external button control)
 * @param {string} props.className - Additional class names
 */
function ExerciseForm({
  initialData = null,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Guardar',
  compact = false,
  hideSubmitButton = false,
  className = '',
}) {
  const { data: muscleGroups, isLoading } = useMuscleGroups()

  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState(null)
  const [error, setError] = useState(null)

  // Populate form with initial data
  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        measurement_type: initialData.measurement_type || 'weight_reps',
        weight_unit: initialData.weight_unit || 'kg',
        instructions: initialData.instructions || '',
      })
      setSelectedMuscleGroupId(initialData.muscle_group_id || null)
    }
  }, [initialData])

  const usesWeight = measurementTypeUsesWeight(form.measurement_type)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    if (!selectedMuscleGroupId) {
      setError('Selecciona un grupo muscular')
      return
    }

    onSubmit(form, selectedMuscleGroupId)
  }

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
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ej: Press banca con barra (Agarre Prono Medio)"
          className="w-full p-3 rounded-lg text-base"
          style={inputStyle}
        />
        <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
          Incluye equipamiento y tipo de agarre en el nombre si aplica
        </p>
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
          {MEASUREMENT_TYPE_OPTIONS.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </Wrapper>

      {/* Unidad de peso (solo si usa peso) */}
      {usesWeight && (
        <Wrapper className={compact ? '' : 'p-4'}>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Unidad de peso
          </label>
          <div className="flex gap-2">
            {WEIGHT_UNITS.map(unit => {
              const isSelected = form.weight_unit === unit.value
              return (
                <button
                  key={unit.value}
                  type="button"
                  onClick={() => handleChange('weight_unit', unit.value)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: isSelected ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
                    color: isSelected ? colors.accent : colors.textPrimary,
                    border: isSelected ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  }}
                >
                  {unit.label}
                </button>
              )
            })}
          </div>
        </Wrapper>
      )}

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
                {group.name}
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

        {/* Instrucciones */}
        <Wrapper className={compact ? '' : 'p-4'}>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            Instrucciones de ejecución
          </label>
          <textarea
            value={form.instructions}
            onChange={(e) => handleChange('instructions', e.target.value)}
            placeholder="Cómo ejecutar el ejercicio correctamente... (incluye altura de polea si aplica)"
            rows={3}
            className="w-full p-3 rounded-lg text-base resize-none"
            style={inputStyle}
          />
        </Wrapper>
      </div>

      {!hideSubmitButton && (
        compact ? (
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 mt-4"
            style={{ backgroundColor: colors.accent, color: '#ffffff' }}
          >
            {isSubmitting ? 'Guardando...' : submitLabel}
          </button>
        ) : (
          <BottomActions
            primary={{
              label: isSubmitting ? 'Guardando...' : submitLabel,
              onClick: handleSubmit,
              disabled: isSubmitting,
            }}
          />
        )
      )}
    </form>
  )
}

export default ExerciseForm
