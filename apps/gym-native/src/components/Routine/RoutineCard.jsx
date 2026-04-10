import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Repeat, Layers } from 'lucide-react-native'
import { colors } from '../../lib/styles'

const CARD_RADIUS = 16
const CARD_PADDING = 16
const CARD_GAP = 14

function StatBadge({ icon: Icon, text }) {
  return (
    <View style={{
      backgroundColor: colors.bgAlt,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    }}>
      <Icon size={12} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '500' }}>
        {text}
      </Text>
    </View>
  )
}

function RoutineCard({ routine, isPinned, onPress }) {
  const { t } = useTranslation()
  const [pressed, setPressed] = useState(false)

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: pressed ? colors.bgAlt : colors.bgSecondary,
        borderRadius: CARD_RADIUS,
        padding: CARD_PADDING,
        borderWidth: 1,
        borderColor: isPinned ? colors.success : colors.border,
        gap: CARD_GAP,
      }}
    >
      {/* Top: Name + Chevron */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>
            {routine.name}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </View>

      {/* Description */}
      {routine.description ? (
        <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
          {routine.description}
        </Text>
      ) : null}

      {/* Stats badges */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatBadge icon={Repeat} text={t('common:home.nDays', { count: routine.days_count || 0 })} />
        <StatBadge icon={Layers} text={t('common:home.nExercises', { count: routine.exercises_count || 0 })} />
      </View>
    </Pressable>
  )
}

export default RoutineCard
