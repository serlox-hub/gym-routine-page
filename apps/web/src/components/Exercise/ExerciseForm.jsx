import { useState, useEffect } from 'react'
import { Card, BottomActions, Input, Select, Textarea } from '../ui/index.js'
import { useMuscleGroups } from '../../hooks/useExercises.js'
import { colors } from '../../lib/styles.js'
import {
  MEASUREMENT_TYPE_OPTIONS,
  MeasurementType,
  getMuscleGroupColor,
  measurementTypeUsesDistance,
  measurementTypeUsesTime,
  measurementTypeUsesWeight
} from '@gym/shared'

const WEIGHT_UNITS = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'lb', label: 'Libras (lb)' },
]

const TIME_UNITS = [
  { value: 's', label: 'Segundos (s)' },
  { value: 'min', label: 'Minutos (min)' },
]

const DISTANCE_UNITS = [
  { value: 'm', label: 'Metros (m)' },
  { value: 'km', label: 'Kilómetros (km)' },
]

function UnitSelector({ label, units, field, form, onChange, Wrapper, compact }) {
  return (
    <Wrapper className={compact ? '' : 'p-4'}>
      <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
        {label}
      </label>
      <div className="flex gap-2">
        {units.map(unit => {
          const isSelected = form[field] === unit.value
          return (
            <button
              key={unit.value}
              type="button"
              onClick={() => onChange(field, unit.value)}
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
  )
}

const DEFAULT_FORM = {
  name: '',
  measurement_type: MeasurementType.WEIGHT_REPS,
  weight_unit: 'kg',
  time_unit: 's',
  distance_unit: 'm',
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
        measurement_type: initialData.measurement_type || MeasurementType.WEIGHT_REPS,
        weight_unit: initialData.weight_unit || 'kg',
        time_unit: initialData.time_unit || 's',
        distance_unit: initialData.distance_unit || 'm',
        instructions: initialData.instructions || '',
      })
      setSelectedMuscleGroupId(initialData.muscle_group_id || null)
    }
  }, [initialData])

  const usesWeight = measurementTypeUsesWeight(form.measurement_type)
  const usesTime = measurementTypeUsesTime(form.measurement_type)
  const usesDistance = measurementTypeUsesDistance(form.measurement_type)

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
        <Input
          label={<>Nombre <span style={{ color: colors.danger }}>*</span></>}
          type="text"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ej: Press banca con barra (Agarre Prono Medio)"
        />
        <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
          Incluye equipamiento y tipo de agarre en el nombre si aplica
        </p>
      </Wrapper>

      {/* Tipo de medición */}
      <Wrapper className={compact ? '' : 'p-4'}>
        <Select
          label={<>Tipo de medición <span style={{ color: colors.danger }}>*</span></>}
          value={form.measurement_type}
          onChange={(e) => handleChange('measurement_type', e.target.value)}
        >
          {MEASUREMENT_TYPE_OPTIONS.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </Select>
      </Wrapper>

      {/* Unidad de peso (solo si usa peso) */}
      {usesWeight && (
        <UnitSelector label="Unidad de peso" units={WEIGHT_UNITS} field="weight_unit" form={form} onChange={handleChange} Wrapper={Wrapper} compact={compact} />
      )}

      {/* Unidad de tiempo (solo si usa tiempo) */}
      {usesTime && (
        <UnitSelector label="Unidad de tiempo" units={TIME_UNITS} field="time_unit" form={form} onChange={handleChange} Wrapper={Wrapper} compact={compact} />
      )}

      {/* Unidad de distancia (solo si usa distancia) */}
      {usesDistance && (
        <UnitSelector label="Unidad de distancia" units={DISTANCE_UNITS} field="distance_unit" form={form} onChange={handleChange} Wrapper={Wrapper} compact={compact} />
      )}

      {/* Grupo muscular */}
      <Wrapper className={compact ? '' : 'p-4'}>
        <label className="text-sm text-secondary mb-1 block">
          Grupo muscular <span style={{ color: colors.danger }}>*</span>
        </label>
        <div className="flex items-center gap-2">
          {selectedMuscleGroupId && (
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: getMuscleGroupColor(
                  muscleGroups?.find(g => g.id === selectedMuscleGroupId)?.name
                ),
              }}
            />
          )}
          <Select
            value={selectedMuscleGroupId || ''}
            onChange={(e) => setSelectedMuscleGroupId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Seleccionar grupo muscular</option>
            {muscleGroups?.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </Select>
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
          <Textarea
            label="Instrucciones de ejecución"
            value={form.instructions}
            onChange={(e) => handleChange('instructions', e.target.value)}
            placeholder="Cómo ejecutar el ejercicio correctamente... (incluye altura de polea si aplica)"
            rows={3}
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
