import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles'

export default function ExerciseProgressBar({ setsCompleted, setsTotal, segments = [], elapsedTime, gymSlot = null }) {
  const { t } = useTranslation()
  if (setsTotal <= 0) return null
  return (
    <View style={{ paddingTop: 8, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600', flexShrink: 1 }}>
          {t('workout:session.setProgress', { current: setsCompleted, total: setsTotal })}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {gymSlot}
          {elapsedTime ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{elapsedTime}</Text>
          ) : null}
        </View>
      </View>
      {/* Un tramo por ejercicio; ancho ∝ nº de series para que el relleno global siga siendo % de series */}
      <View style={{ flexDirection: 'row', width: '100%', height: 6, gap: 2 }}>
        {segments.map((seg, i) => (
          <View
            key={seg.sessionExerciseId ?? i}
            style={{ flexGrow: seg.setsTotal, flexBasis: 0, height: '100%', borderRadius: 3, backgroundColor: colors.bgTertiary, overflow: 'hidden' }}
          >
            <View
              style={{
                height: '100%',
                width: `${seg.fillPct}%`,
                backgroundColor: colors.success,
                borderRadius: 3,
              }}
            />
          </View>
        ))}
      </View>
    </View>
  )
}
