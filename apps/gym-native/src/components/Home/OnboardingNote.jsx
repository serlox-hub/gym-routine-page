import { View, Text } from 'react-native'
import { Info } from 'lucide-react-native'
import { colors } from '../../lib/styles'

// An onboarding note: why a goal has no routine of its own, or how the routine's days fit the user's.
export default function OnboardingNote({ children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}>
      <Info size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
      <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>{children}</Text>
    </View>
  )
}
