import { colors } from '../../lib/styles.js'

function ExerciseSearchSectionTitle({ children }) {
  return (
    <h4 className="text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>
      {children}
    </h4>
  )
}

export default ExerciseSearchSectionTitle
