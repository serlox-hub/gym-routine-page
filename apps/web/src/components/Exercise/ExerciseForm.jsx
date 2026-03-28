import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
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

function MuscleGroupPicker({ muscleGroups, selectedId, onChange, required }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = muscleGroups?.find(g => g.id === selectedId)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <label className="text-sm text-secondary mb-1 block">
        Grupo muscular{required && <span style={{ color: colors.danger }}> *</span>}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left"
        style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}`, color: selected ? colors.textPrimary : colors.textSecondary }}
      >
        {selected && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getMuscleGroupColor(selected.name) }} />}
        <span className="flex-1">{selected?.name || 'Seleccionar grupo muscular'}</span>
        <ChevronDown size={14} style={{ color: colors.textSecondary }} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg py-1 max-h-60 overflow-y-auto shadow-lg" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
          {muscleGroups?.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => { onChange(g.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-80"
              style={selectedId === g.id ? { backgroundColor: 'rgba(88,166,255,0.1)' } : undefined}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getMuscleGroupColor(g.name) }} />
              <span style={{ color: selectedId === g.id ? colors.accent : colors.textPrimary }}>{g.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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
  id,
  initialData = null,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Guardar',
  compact = false,
  hideSubmitButton = false,
  minimal = false,
  className = '',
}) {
  const { data: muscleGroups, isLoading } = useMuscleGroups()

  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState(null)
  const [error, setError] = useState(null)
  const formRef = useRef({ form, selectedMuscleGroupId })
  formRef.current = { form, selectedMuscleGroupId }

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
    e?.preventDefault()
    setError(null)
    const { form: f, selectedMuscleGroupId: mgId } = formRef.current

    if (!f.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    if (!mgId) {
      setError('Selecciona un grupo muscular')
      return
    }

    onSubmit(f, mgId)
  }

  // Expose handleSubmit for external use (e.g. ExerciseFormPanel buttons)
  useEffect(() => {
    ExerciseForm._submit = handleSubmit
  })

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
    <form id={id} onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)', color: colors.danger }}
        >
          {error}
        </div>
      )}

      {/* === CAMPOS OBLIGATORIOS === */}

      <Wrapper className={compact ? '' : 'p-4'}>
        <Input
          label={minimal ? 'Nombre' : <>Nombre <span style={{ color: colors.danger }}>*</span></>}
          type="text"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ej: Press banca con barra"
        />
        {!minimal && (
          <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
            Incluye equipamiento y tipo de agarre en el nombre si aplica
          </p>
        )}
      </Wrapper>

      <Wrapper className={compact ? '' : 'p-4'}>
        <Select
          label={minimal ? 'Tipo de medición' : <>Tipo de medición <span style={{ color: colors.danger }}>*</span></>}
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

      <Wrapper className={compact ? '' : 'p-4'}>
        <MuscleGroupPicker
          muscleGroups={muscleGroups}
          selectedId={selectedMuscleGroupId}
          onChange={setSelectedMuscleGroupId}
          required={!minimal}
        />
      </Wrapper>

      <div
        className={minimal ? '' : 'pt-4 mt-2 border-t'}
        style={minimal ? undefined : { borderColor: colors.border }}
      >
        {!minimal && (
          <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>
            Campos opcionales
          </p>
        )}

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
