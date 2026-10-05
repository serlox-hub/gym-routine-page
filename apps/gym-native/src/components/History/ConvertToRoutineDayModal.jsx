import { useEffect } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, AccessibilityInfo } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react-native'
import { useConvertSessionToRoutineDayForm } from '@gym/shared'
import { Modal, Button, LoadingSpinner } from '../ui'
import { colors, design, inputStyle } from '../../lib/styles'

// Mounted only while open: the form hook starts from the defaults on every opening.
export default function ConvertToRoutineDayModal({ session, onClose, onConverted }) {
  const { t } = useTranslation()
  const form = useConvertSessionToRoutineDayForm({ session, onSuccess: onConverted })

  // Parity with the web live region: the answer of a blocked Confirm cannot be silent for
  // VoiceOver/TalkBack (`accessibilityLiveRegion` alone only works on Android).
  useEffect(() => {
    if (form.notice) AccessibilityInfo.announceForAccessibility(form.notice.text)
  }, [form.notice])

  const options = [
    { key: 'new', label: t('workout:history.convertToDay.newRoutine'), isNew: true, selected: form.isNewRoutine, onSelect: form.selectNewRoutine },
    ...form.routines.map(routine => ({
      key: String(routine.id),
      label: routine.name,
      isNew: false,
      selected: form.selectedRoutineId === String(routine.id),
      onSelect: () => form.selectRoutine(routine.id),
    })),
  ]

  return (
    <Modal isOpen onClose={form.isPending ? undefined : onClose} className="p-5">
      <View style={{ gap: 16 }}>
        <View>
          <Text className="text-primary text-lg font-semibold mb-1">{t('workout:history.convertToDay.title')}</Text>
          <Text className="text-secondary text-sm">{t('workout:history.convertToDay.description')}</Text>
        </View>

        <View>
          <Text className="text-secondary text-sm mb-1">{t('workout:history.convertToDay.routine')}</Text>
          <ScrollView
            style={{ maxHeight: 220 }}
            contentContainerStyle={{ gap: 8 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            accessibilityRole="radiogroup"
          >
            {options.map(option => (
              <Pressable
                key={option.key}
                onPress={option.onSelect}
                accessibilityRole="radio"
                accessibilityState={{ checked: option.selected }}
                className="p-3 rounded-lg flex-row items-center"
                style={{
                  minHeight: design.minTouchTarget,
                  gap: 8,
                  backgroundColor: option.selected ? colors.successBg : colors.bgTertiary,
                  borderWidth: 1,
                  borderColor: option.selected ? colors.success : 'transparent',
                }}
              >
                {option.isNew && <Plus size={16} color={option.selected ? colors.success : colors.textPrimary} />}
                <Text numberOfLines={1} style={{ flexShrink: 1, color: option.selected ? colors.success : colors.textPrimary }}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
            {form.isLoadingRoutines && <LoadingSpinner inline />}
          </ScrollView>
          {/* Without it, "couldn't load them" reads as "you have none" and invites a duplicate routine. */}
          {form.isRoutinesError && (
            <View className="flex-row items-center justify-between mt-2" style={{ gap: 12 }}>
              <Text className="text-sm" style={{ flexShrink: 1, color: colors.danger }}>
                {t('workout:history.convertToDay.routinesLoadError')}
              </Text>
              <Button variant="secondary" size="sm" onPress={form.retryRoutines}>
                {t('common:buttons.retry')}
              </Button>
            </View>
          )}
        </View>

        {form.isNewRoutine && (
          <View>
            <Text className="text-secondary text-sm mb-1">{t('workout:history.convertToDay.routineName')}</Text>
            <TextInput
              value={form.newRoutineName}
              onChangeText={form.setNewRoutineName}
              autoFocus
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
          </View>
        )}

        <View>
          <Text className="text-secondary text-sm mb-1">{t('workout:history.convertToDay.dayName')}</Text>
          <TextInput
            value={form.dayName}
            onChangeText={form.setDayName}
            returnKeyType="done"
            onSubmitEditing={form.submit}
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
          />
        </View>

        {form.notice && (
          <Text
            className="text-sm"
            style={{ color: form.notice.type === 'error' ? colors.danger : colors.textSecondary }}
          >
            {form.notice.text}
          </Text>
        )}

        <View className="flex-row gap-3 justify-end">
          <Button variant="secondary" onPress={onClose} disabled={form.isPending}>
            {t('common:buttons.cancel')}
          </Button>
          <Button onPress={form.submit} loading={form.isPending} blocked={form.isBlocked}>
            {t('workout:history.convertToDay.confirm')}
          </Button>
        </View>
      </View>
    </Modal>
  )
}
