import { Info } from 'lucide-react'
import { colors } from '../../lib/styles.js'

// An onboarding note: why a goal has no routine of its own, or how the routine's days fit the user's.
function OnboardingNote({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-lg" style={{ padding: '10px 12px', backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}>
      <Info size={14} color={colors.textMuted} style={{ marginTop: 1, flexShrink: 0 }} />
      <span style={{ color: colors.textSecondary, fontSize: 12 }}>{children}</span>
    </div>
  )
}

export default OnboardingNote
