import { colors } from '../../lib/styles.js'

function ExerciseBadge({ label, dot, accent }) {
  if (!label) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
      style={{
        backgroundColor: accent ? colors.successBgSubtle : colors.bgTertiary,
        color: accent ? colors.success : colors.textSecondary,
      }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />}
      {label}
    </span>
  )
}

export default ExerciseBadge
