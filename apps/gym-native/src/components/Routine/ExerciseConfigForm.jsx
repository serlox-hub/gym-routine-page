import { View, Text, TextInput, Pressable, ScrollView, Modal as RNModal } from 'react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react-native'
import { Button } from '../ui'
import { colors, inputStyle } from '../../lib/styles'
import { formatSupersetLabel, getRepsLabel, getRepsPlaceholder } from '@gym/shared'

function FormField({ label, required, secondary, children }) {
  return (
    <View>
      <Text
        className="text-sm font-medium mb-1"
        style={{ color: secondary ? colors.textSecondary : colors.textPrimary }}
      >
        {label}{required && <Text style={{ color: colors.danger }}> *</Text>}
      </Text>
      {children}
    </View>
  )
}

function SupersetPicker({ value, onChange, existingSupersets, nextSupersetId }) {
  const { t } = useTranslation()
  const [showPicker, setShowPicker] = useState(false)

  const options = [
    { value: '', label: t('routine:superset.noSuperset') },
    ...existingSupersets.map(id => ({ value: String(id), label: formatSupersetLabel(id) })),
    { value: String(nextSupersetId), label: `+ ${t('common:labels.new')} ${formatSupersetLabel(nextSupersetId)}` },
  ]

  const selected = options.find(o => o.value === (value || ''))

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        className="flex-row items-center justify-between p-3 rounded-lg"
        style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
      >
        <Text style={{ color: value ? colors.textPrimary : colors.textSecondary }}>
          {selected?.label || t('routine:superset.noSuperset')}
        </Text>
        <ChevronDown size={16} color={colors.textSecondary} />
      </Pressable>
      <RNModal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable
          onPress={() => setShowPicker(false)}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-surface-block rounded-t-2xl pb-8">
            <Text className="text-primary font-semibold p-4">{t('routine:superset.title')}</Text>
            {options.map(opt => (
              <Pressable
                key={opt.value}
                onPress={() => { onChange(opt.value); setShowPicker(false) }}
                className="px-4 py-3"
                style={(value || '') === opt.value ? { backgroundColor: colors.accentBgSubtle } : {}}
              >
                <Text style={{ color: (value || '') === opt.value ? colors.accent : colors.textPrimary }}>
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

export default function ExerciseConfigForm({
  exercise,
  form,
  setForm,
  isSessionMode = false,
  existingSupersets = [],
  nextSupersetId = 1,
  showSupersetField = false,
  hideExerciseName = false,
}) {
  const { t } = useTranslation()
  const update = (field) => (value) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {!hideExerciseName && (
        <View className="p-3 rounded-lg mb-4" style={{ backgroundColor: colors.accentBgSubtle }}>
          <Text className="text-primary font-medium">{exercise.name}</Text>
        </View>
      )}

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <FormField label={t('routine:exercise.series')} required={!isSessionMode}>
            <TextInput
              value={form.series}
              onChangeText={update('series')}
              keyboardType="numeric"
              style={inputStyle}
            />
          </FormField>
        </View>
        <View className="flex-1">
          <FormField label={getRepsLabel(exercise.measurement_type)} required={!isSessionMode}>
            <TextInput
              value={form.reps}
              onChangeText={update('reps')}
              placeholder={getRepsPlaceholder(exercise.measurement_type)}
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
            <FormField label="RIR" secondary>
              <TextInput
                value={form.rir}
                onChangeText={update('rir')}
                placeholder="Ej: 2"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={inputStyle}
              />
            </FormField>
          </View>
          <View className="flex-1">
            <FormField label={t('routine:exercise.rest')} secondary>
              <TextInput
                value={form.rest_seconds}
                onChangeText={update('rest_seconds')}
                placeholder="Ej: 90"
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
              <SupersetPicker
                value={form.superset_group}
                onChange={update('superset_group')}
                existingSupersets={existingSupersets}
                nextSupersetId={nextSupersetId}
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
