import { colors } from '../../lib/styles.js'

function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="text-sm mb-1 block" style={{ color: colors.textSecondary }}>
          {label}
        </label>
      )}
      <input
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
        style={{
          backgroundColor: colors.bgTertiary,
          border: `1px solid ${colors.border}`,
          color: colors.textPrimary,
        }}
        {...props}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: colors.danger }}>{error}</p>
      )}
    </div>
  )
}

export default Input
