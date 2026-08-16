import { View, Text, TextInput, Pressable, ScrollView, Modal as RNModal } from 'react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, NumberTextInput } from '../ui'
import { colors, inputStyle } from '../../lib/styles'
import {
  formatSupersetLabel,
  getEffortLabel,
  getEffortOptions,
  getRepsLabel,
  getRepsPlaceholder,
  getExerciseName,
} from '@gym/shared'

function FormField({ label, required, secondary, error, children }) {
  return (
    <View>
      <Text
        className="text-sm font-medium mb-1"
        style={{ color: secondary ? colors.textSecondary : colors.textPrimary }}
      >
        {label}{required && <Text style={{ color: colors.danger }}> *</Text>}
      </Text>
      {children}
      {error && <Text className="text-xs mt-1" style={{ color: colors.danger }}>{error}</Text>}
    </View>
  )
}

const PICKER_BOTTOM_PADDING = 32

/** Equivalente nativo del <select> web: fila pulsable + hoja de opciones. */
function OptionPicker({ value, onChange, options, title, emptyLabel }) {
  const [showPicker, setShowPicker] = useState(false)
  const insets = useSafeAreaInsets()
  const current = value ?? ''
  const selected = options.find(o => o.value === current)

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        className="flex-row items-center justify-between p-3 rounded-lg"
        style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
      >
        <Text style={{ color: current ? colors.textPrimary : colors.textSecondary }}>
          {selected?.label || emptyLabel}
        </Text>
        <ChevronDown size={16} color={colors.textSecondary} />
      </Pressable>
      <RNModal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable
          onPress={() => setShowPicker(false)}
          className="flex-1 justify-end"
          style={{ backgroundColor: colors.overlaySoft }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-block rounded-t-2xl"
            style={{ paddingBottom: insets.bottom + PICKER_BOTTOM_PADDING }}
          >
            <Text className="text-primary font-semibold p-4">{title}</Text>
            {options.map(opt => (
              <Pressable
                key={opt.value}
                onPress={() => { onChange(opt.value); setShowPicker(false) }}
                className="px-4 py-3"
                style={current === opt.value ? { backgroundColor: colors.successBgSubtle } : {}}
              >
                <Text style={{ color: current === opt.value ? colors.success : colors.textPrimary }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </RNModal>
    </>
  )
}

/**
 * Formulario para configurar series, objetivo, esfuerzo y notas de un ejercicio.
 * Espejo del equivalente web: los campos se adaptan al `measurement_type`
 * (objetivo en reps/tiempo/distancia/kcal, esfuerzo en RIR o RPE). `series`
 * aplica a todos los tipos: define cuántas filas se registran en la sesión.
 */
export default function ExerciseConfigForm({
  exercise,
  form,
  setForm,
  isSessionMode = false,
  existingSupersets = [],
  nextSupersetId = 1,
  showSupersetField = false,
  hideExerciseName = false,
  errors = {},
}) {
  const { t } = useTranslation()
  const update = (field) => (value) => setForm(prev => ({ ...prev, [field]: value }))
  const measurementType = exercise?.measurement_type
  const effortOptions = [
    { value: '', label: t('common:labels.none') },
    ...getEffortOptions(measurementType).map(opt => ({ value: String(opt.value), label: opt.label })),
  ]
  const supersetOptions = [
    { value: '', label: t('routine:superset.noSuperset') },
    ...existingSupersets.map(id => ({ value: String(id), label: formatSupersetLabel(id) })),
    { value: String(nextSupersetId), label: `+ ${t('common:labels.new')} ${formatSupersetLabel(nextSupersetId)}` },
  ]

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {!hideExerciseName && (
        <View className="p-3 rounded-lg mb-4" style={{ backgroundColor: colors.bgTertiary }}>
          <Text className="text-primary font-medium">{getExerciseName(exercise)}</Text>
        </View>
      )}

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <FormField label={t('routine:exercise.series')} required error={errors.series}>
            <NumberTextInput
              value={form.series}
              onChangeText={update('series')}
              keyboardType="numeric"
              style={inputStyle}
            />
          </FormField>
        </View>
        <View className="flex-1">
          <FormField label={getRepsLabel(measurementType)} required error={errors.reps}>
            <TextInput
              value={form.reps}
              onChangeText={update('reps')}
              placeholder={getRepsPlaceholder(measurementType)}
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
          </FormField>
        </View>
      </View>

      <View className={`gap-3 ${isSessionMode ? '' : 'pt-3 border-t border-border'}`}>
        {!isSessionMode && <Text className="text-secondary text-xs">{t('common:labels.optional')}</Text>}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField label={getEffortLabel(measurementType)} secondary error={errors.rir}>
              <OptionPicker
                value={form.rir}
                onChange={update('rir')}
                options={effortOptions}
                title={getEffortLabel(measurementType)}
                emptyLabel={t('common:labels.none')}
              />
            </FormField>
          </View>
          <View className="flex-1">
            <FormField label={t('routine:exercise.rest')} secondary error={errors.rest_seconds}>
              <NumberTextInput
                value={form.rest_seconds}
                onChangeText={update('rest_seconds')}
                placeholder={t('routine:exercise.restPlaceholder')}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={inputStyle}
              />
            </FormField>
          </View>
        </View>

        <FormField label={t('routine:exercise.notes')} secondary>
          <TextInput
            value={form.notes}
            onChangeText={update('notes')}
            placeholder={t('routine:exercise.notesPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            style={[inputStyle, { textAlignVertical: 'top', minHeight: 56 }]}
          />
        </FormField>

        {showSupersetField && (
          <View>
            <FormField label={t('routine:superset.title')} secondary>
              <OptionPicker
                value={form.superset_group}
                onChange={update('superset_group')}
                options={supersetOptions}
                title={t('routine:superset.title')}
                emptyLabel={t('routine:superset.noSuperset')}
              />
            </FormField>
            <Text className="text-secondary text-xs mt-1">
              {t('routine:superset.description')}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export function ExerciseConfigFormButtons({ onBack, onSubmit, isPending, backLabel, submitLabel, pendingLabel }) {
  const { t } = useTranslation()
  backLabel = backLabel || t('common:buttons.back')
  submitLabel = submitLabel || t('common:buttons.add')
  pendingLabel = pendingLabel || t('common:buttons.loading')
  return (
    <View className="flex-row gap-3 px-4 pt-3 border-t border-border">
      <Button variant="secondary" className="flex-1" onPress={onBack}>{backLabel}</Button>
      <Button className="flex-1" onPress={onSubmit} disabled={isPending} loading={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </View>
  )
}
