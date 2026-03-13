import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Modal as RNModal } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { Card, Button } from '../ui'
import { useMuscleGroups } from '../../hooks/useExercises'
import { colors, inputStyle } from '../../lib/styles'
import {
  MEASUREMENT_TYPE_OPTIONS,
  measurementTypeUsesWeight,
  measurementTypeUsesTime,
  measurementTypeUsesDistance,
  MeasurementType,
} from '../../lib/measurementTypes'
import { getMuscleGroupColor } from '../../lib/constants'

const UNIT_OPTIONS = {
  weight: [
    { value: 'kg', label: 'Kilogramos (kg)' },
    { value: 'lb', label: 'Libras (lb)' },
  ],
  time: [
    { value: 's', label: 'Segundos (s)' },
    { value: 'min', label: 'Minutos (min)' },
  ],
  distance: [
    { value: 'm', label: 'Metros (m)' },
    { value: 'km', label: 'Kilómetros (km)' },
  ],
}

const DEFAULT_FORM = {
  name: '',
  measurement_type: MeasurementType.WEIGHT_REPS,
  weight_unit: 'kg',
  time_unit: 's',
  distance_unit: 'm',
  instructions: '',
}

function BottomSheetPicker({ visible, onClose, title, options, selected, onSelect }) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable onPress={(e) => e.stopPropagation()} className="bg-surface-block rounded-t-2xl pb-8">
          <Text className="text-primary font-semibold p-4">{title}</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {options.map(opt => (
              <Pressable
                key={opt.value}
                onPress={() => { onSelect(opt.value); onClose() }}
                className="px-4 py-3 flex-row items-center gap-2"
                style={selected === opt.value ? { backgroundColor: 'rgba(88,166,255,0.1)' } : {}}
              >
                {opt.color && <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opt.color }} />}
                <Text style={{ color: selected === opt.value ? colors.accent : colors.textPrimary }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  )
}

function UnitSelector({ label, units, field, form, onChange }) {
  return (
    <View className="mb-4">
      <Text className="text-primary text-sm font-medium mb-2">{label}</Text>
      <View className="flex-row gap-2">
        {units.map(unit => {
          const isSelected = form[field] === unit.value
          return (
            <Pressable
              key={unit.value}
              onPress={() => onChange(field, unit.value)}
              className="flex-1 py-2 px-3 rounded-lg items-center"
              style={{
                backgroundColor: isSelected ? 'rgba(88,166,255,0.15)' : colors.bgTertiary,
                borderWidth: 1,
                borderColor: isSelected ? colors.accent : colors.border,
              }}
            >
              <Text className="text-sm" style={{ color: isSelected ? colors.accent : colors.textPrimary }}>
                {unit.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export default function ExerciseForm({
  initialData = null,
  onSubmit,
  isSubmitting = false,
  compact = false,
  hideSubmitButton = false,
}) {
  const { data: muscleGroups, isLoading } = useMuscleGroups()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState(null)
  const [error, setError] = useState(null)
  const [showMeasurementPicker, setShowMeasurementPicker] = useState(false)
  const [showMuscleGroupPicker, setShowMuscleGroupPicker] = useState(false)
  const formRef = useRef({ form, selectedMuscleGroupId })

  useEffect(() => {
    formRef.current = { form, selectedMuscleGroupId }
  }, [form, selectedMuscleGroupId])

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

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = () => {
    setError(null)
    const { form: f, selectedMuscleGroupId: mgId } = formRef.current
    if (!f.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!mgId) { setError('Selecciona un grupo muscular'); return }
    onSubmit(f, mgId)
  }

  // Expose handleSubmit for external use via ref pattern
  useEffect(() => {
    ExerciseForm._submit = handleSubmit
  })

  if (isLoading) return <Text className="text-secondary text-center py-8">Cargando...</Text>

  const selectedMeasurement = MEASUREMENT_TYPE_OPTIONS.find(o => o.value === form.measurement_type)
  const selectedGroup = muscleGroups?.find(g => g.id === selectedMuscleGroupId)

  const muscleGroupOptions = muscleGroups?.map(g => ({
    value: g.id,
    label: g.name,
    color: getMuscleGroupColor(g.name),
  })) || []

  return (
    <View>
      {error && (
        <View className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'rgba(248,81,73,0.1)' }}>
          <Text style={{ color: colors.danger }}>{error}</Text>
        </View>
      )}

      <View className="mb-4">
        <Text className="text-primary text-sm font-medium mb-2">
          Nombre <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <TextInput
          value={form.name}
          onChangeText={(v) => handleChange('name', v)}
          placeholder="Ej: Press banca con barra"
          placeholderTextColor="#6e7681"
          style={inputStyle}
        />
        <Text className="text-secondary text-xs mt-1">
          Incluye equipamiento y tipo de agarre si aplica
        </Text>
      </View>

      <View className="mb-4">
        <Text className="text-primary text-sm font-medium mb-2">
          Tipo de medición <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <Pressable
          onPress={() => setShowMeasurementPicker(true)}
          className="flex-row items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="text-primary">{selectedMeasurement?.label || 'Seleccionar'}</Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      {measurementTypeUsesWeight(form.measurement_type) && (
        <UnitSelector label="Unidad de peso" units={UNIT_OPTIONS.weight} field="weight_unit" form={form} onChange={handleChange} />
      )}
      {measurementTypeUsesTime(form.measurement_type) && (
        <UnitSelector label="Unidad de tiempo" units={UNIT_OPTIONS.time} field="time_unit" form={form} onChange={handleChange} />
      )}
      {measurementTypeUsesDistance(form.measurement_type) && (
        <UnitSelector label="Unidad de distancia" units={UNIT_OPTIONS.distance} field="distance_unit" form={form} onChange={handleChange} />
      )}

      <View className="mb-4">
        <Text className="text-primary text-sm font-medium mb-2">
          Grupo muscular <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <Pressable
          onPress={() => setShowMuscleGroupPicker(true)}
          className="flex-row items-center gap-2 p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
        >
          {selectedGroup && (
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: getMuscleGroupColor(selectedGroup.name) }} />
          )}
          <Text className="flex-1" style={{ color: selectedGroup ? colors.textPrimary : colors.textSecondary }}>
            {selectedGroup?.name || 'Seleccionar grupo muscular'}
          </Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View className="pt-4 border-t border-border">
        <Text className="text-secondary text-xs mb-4">Campos opcionales</Text>
        <View>
          <Text className="text-secondary text-sm font-medium mb-2">Instrucciones de ejecución</Text>
          <TextInput
            value={form.instructions}
            onChangeText={(v) => handleChange('instructions', v)}
            placeholder="Cómo ejecutar el ejercicio correctamente..."
            placeholderTextColor="#6e7681"
            multiline
            numberOfLines={3}
            style={[inputStyle, { textAlignVertical: 'top', minHeight: 80 }]}
          />
        </View>
      </View>

      {!hideSubmitButton && (
        <Button onPress={handleSubmit} loading={isSubmitting} className="w-full mt-4">
          Guardar
        </Button>
      )}

      <BottomSheetPicker
        visible={showMeasurementPicker}
        onClose={() => setShowMeasurementPicker(false)}
        title="Tipo de medición"
        options={MEASUREMENT_TYPE_OPTIONS}
        selected={form.measurement_type}
        onSelect={(v) => handleChange('measurement_type', v)}
      />

      <BottomSheetPicker
        visible={showMuscleGroupPicker}
        onClose={() => setShowMuscleGroupPicker(false)}
        title="Grupo muscular"
        options={muscleGroupOptions}
        selected={selectedMuscleGroupId}
        onSelect={(v) => setSelectedMuscleGroupId(v)}
      />
    </View>
  )
}
