import { View, Text } from 'react-native'
import { colors } from '../../lib/styles'

export default function ExerciseBadge({ label, dot, accent }) {
  if (!label) return null
  return (
    <View
      className="flex-row items-center gap-1 px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: accent ? colors.successBgSubtle : colors.bgTertiary }}
    >
      {dot && <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />}
      <Text style={{ fontSize: 10, color: accent ? colors.success : colors.textSecondary }}>{label}</Text>
    </View>
  )
}
