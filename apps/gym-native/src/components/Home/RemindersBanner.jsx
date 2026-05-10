import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Bell, ChevronRight } from 'lucide-react-native'
import { usePendingReminders } from '@gym/shared'
import { colors } from '../../lib/styles'

function ReminderRow({ message, onPress }) {
  const { t } = useTranslation()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: colors.warningBg,
        borderWidth: 1,
        borderColor: `${colors.warning}33`,
      }}
    >
      <Bell size={16} color={colors.warning} />
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.textPrimary }}>
        {message}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warning }}>
          {t('common:reminders.cta')}
        </Text>
        <ChevronRight size={14} color={colors.warning} />
      </View>
    </Pressable>
  )
}

export default function RemindersBanner({ navigation }) {
  const { t } = useTranslation()
  const { weight, measurements } = usePendingReminders()

  if (!weight && !measurements) return null

  const goToBody = () => navigation.navigate('BodyMetrics')

  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      {weight && (
        <ReminderRow
          message={t('common:reminders.weightTitle', { count: weight.daysSince })}
          onPress={goToBody}
        />
      )}
      {measurements && (
        <ReminderRow
          message={t('common:reminders.measurementsTitle', { count: measurements.daysSince })}
          onPress={goToBody}
        />
      )}
    </View>
  )
}
