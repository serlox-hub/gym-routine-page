import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import Modal from '../ui/Modal'
import { colors } from '../../lib/styles'

function OptionButton({ label, description, onPress, disabled, variant = 'primary' }) {
  const isPrimary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        width: '100%',
        borderRadius: 8,
        padding: 12,
        backgroundColor: isPrimary ? colors.actionPrimary : colors.bgTertiary,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: isPrimary ? colors.textDark : colors.textPrimary }}>
        {label}
      </Text>
      <Text style={{ fontSize: 12, marginTop: 4, color: isPrimary ? colors.textDark : colors.textSecondary, opacity: 0.85 }}>
        {description}
      </Text>
    </Pressable>
  )
}

export default function WeightUnitChangeModal({
  isOpen,
  scope,
  fromUnit,
  toUnit,
  onConvert,
  onUnitOnly,
  onCancel,
  isPending = false,
}) {
  const { t } = useTranslation()

  const messageKey = scope === 'global' ? 'common:weightUnitChange.messageGlobal' : 'common:weightUnitChange.messageExercise'

  return (
    <Modal isOpen={isOpen} onClose={isPending ? undefined : onCancel} className="p-6">
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
        {t('common:weightUnitChange.title')}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
        {t(messageKey, { from: fromUnit, to: toUnit })}
      </Text>

      <View style={{ gap: 8 }}>
        <OptionButton
          label={t('common:weightUnitChange.convert')}
          description={t('common:weightUnitChange.convertDescription')}
          onPress={onConvert}
          disabled={isPending}
          variant="primary"
        />
        <OptionButton
          label={t('common:weightUnitChange.unitOnly')}
          description={t('common:weightUnitChange.unitOnlyDescription', { to: toUnit })}
          onPress={onUnitOnly}
          disabled={isPending}
          variant="secondary"
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
        <Pressable
          onPress={onCancel}
          disabled={isPending}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, opacity: isPending ? 0.5 : 1 }}
        >
          <Text style={{ fontSize: 14, color: colors.textMuted }}>
            {isPending ? t('common:weightUnitChange.applying') : t('common:buttons.cancel')}
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}
