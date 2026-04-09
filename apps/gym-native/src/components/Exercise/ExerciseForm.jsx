import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Modal as RNModal } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react-native'
import { Button } from '../ui'
import { useMuscleGroups } from '../../hooks/useExercises'
import { colors, inputStyle } from '../../lib/styles'
import {
  MEASUREMENT_TYPE_OPTIONS,
  MeasurementType,
  getMuscleGroupColor,
  getMuscleGroupName,
} from '@gym/shared'

const DEFAULT_FORM = {
  name: '',
  measurement_type: MeasurementType.WEIGHT_REPS,
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
                style={selected === opt.value ? { backgroundColor: colors.accentBgSubtle } : {}}
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

export default function ExerciseForm({
  initialData = null,
  onSubmit,
  isSubmitting = false,
  compact: _compact = false,
  hideSubmitButton = false,
  minimal = false,
}) {
  const { t } = useTranslation()
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
        instructions: initialData.instructions || '',
      })
      setSelectedMuscleGroupId(initialData.muscle_group_id || null)
    }
  }, [initialData])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = () => {
    setError(null)
    const { form: f, selectedMuscleGroupId: mgId } = formRef.current
    if (!f.name.trim()) { setError(t('exercise:nameRequired')); return }
    if (!mgId) { setError(t('exercise:muscleGroupRequired')); return }
    onSubmit(f, mgId)
  }

  // Expose handleSubmit for external use via ref pattern
  useEffect(() => {
    ExerciseForm._submit = handleSubmit
  })

  if (isLoading) return <Text className="text-secondary text-center py-8">{t('common:buttons.loading')}</Text>

  const selectedMeasurement = MEASUREMENT_TYPE_OPTIONS.find(o => o.value === form.measurement_type)
  const selectedGroup = muscleGroups?.find(g => g.id === selectedMuscleGroupId)

  const muscleGroupOptions = muscleGroups?.map(g => ({
    value: g.id,
    label: getMuscleGroupName(g),
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
          {t('exercise:name')}{!minimal && <Text style={{ color: colors.danger }}> *</Text>}
        </Text>
        <TextInput
          value={form.name}
          onChangeText={(v) => handleChange('name', v)}
          placeholder={t('exercise:namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
        />
        {!minimal && (
          <Text className="text-secondary text-xs mt-1">
            {t('exercise:nameHint')}
          </Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-primary text-sm font-medium mb-2">
          {t('exercise:measurementType')}{!minimal && <Text style={{ color: colors.danger }}> *</Text>}
        </Text>
        <Pressable
          onPress={() => setShowMeasurementPicker(true)}
          className="flex-row items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
        >
          <Text className="text-primary">{selectedMeasurement?.label || t('common:buttons.select')}</Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View className="mb-4">
        <Text className="text-primary text-sm font-medium mb-2">
          {t('exercise:muscleGroup')}{!minimal && <Text style={{ color: colors.danger }}> *</Text>}
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
            {selectedGroup?.name || t('exercise:selectMuscleGroup')}
          </Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View className={minimal ? '' : 'pt-4 border-t border-border'}>
        {!minimal && <Text className="text-secondary text-xs mb-4">{t('common:labels.optional')}</Text>}
        <View>
          <Text className="text-secondary text-sm font-medium mb-2">{t('exercise:instructions')}</Text>
          <TextInput
            value={form.instructions}
            onChangeText={(v) => handleChange('instructions', v)}
            placeholder={t('exercise:instructionsPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={[inputStyle, { textAlignVertical: 'top', minHeight: 80 }]}
          />
        </View>
      </View>

      {!hideSubmitButton && (
        <Button onPress={handleSubmit} loading={isSubmitting} className="w-full mt-4">
          {t('common:buttons.save')}
        </Button>
      )}

      <BottomSheetPicker
        visible={showMeasurementPicker}
        onClose={() => setShowMeasurementPicker(false)}
        title={t('exercise:measurementType')}
        options={MEASUREMENT_TYPE_OPTIONS}
        selected={form.measurement_type}
        onSelect={(v) => handleChange('measurement_type', v)}
      />

      <BottomSheetPicker
        visible={showMuscleGroupPicker}
        onClose={() => setShowMuscleGroupPicker(false)}
        title={t('exercise:muscleGroup')}
        options={muscleGroupOptions}
        selected={selectedMuscleGroupId}
        onSelect={(v) => setSelectedMuscleGroupId(v)}
      />
    </View>
  )
}
