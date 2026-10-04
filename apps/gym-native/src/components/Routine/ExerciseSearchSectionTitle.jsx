import { Text } from 'react-native'
import { colors } from '../../lib/styles'

export default function ExerciseSearchSectionTitle({ children }) {
  return (
    <Text accessibilityRole="header" className="text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>
      {children}
    </Text>
  )
}
