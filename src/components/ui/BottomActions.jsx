import { colors } from '../../lib/styles.js'

function BottomActions({
  primary,
  secondary,
}) {
  const hasSecondary = !!secondary

  return (
    <div
      className="fixed bottom-0 left-0 right-0 p-4"
      style={{ backgroundColor: colors.bgPrimary, borderTop: `1px solid ${colors.border}` }}
    >
      <div className={`max-w-2xl mx-auto ${hasSecondary ? 'flex gap-3' : ''}`}>
        {secondary && (
          <button
            onClick={secondary.onClick}
            disabled={secondary.disabled}
            className="py-2.5 px-4 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: secondary.danger ? 'rgba(248, 81, 73, 0.15)' : colors.bgTertiary,
              color: secondary.danger ? colors.danger : colors.textPrimary,
            }}
          >
            {secondary.label}
          </button>
        )}
        {primary && (
          <button
            onClick={primary.onClick}
            disabled={primary.disabled}
            className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${hasSecondary ? 'flex-1' : 'w-full'}`}
            style={{
              backgroundColor: colors.accent,
              color: '#ffffff',
            }}
          >
            {primary.label}
          </button>
        )}
      </div>
    </div>
  )
}

export default BottomActions
