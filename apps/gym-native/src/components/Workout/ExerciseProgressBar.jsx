import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles'

export default function ExerciseProgressBar({ completed, total, elapsedTime, pct, gymSlot = null }) {
  const { t } = useTranslation()
  if (total <= 0) return null
  const fillPct = pct ?? Math.round((completed / total) * 100)
  return (
    <View style={{ paddingTop: 8, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600', flexShrink: 1 }}>
          {t('workout:session.exerciseProgress', { current: completed, total })}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {gymSlot}
          {elapsedTime ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{elapsedTime}</Text>
          ) : null}
        </View>
      </View>
      <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.bgTertiary, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${fillPct}%`, backgroundColor: colors.success, borderRadius: 3 }} />
      </View>
    </View>
  )
}
