import { colors } from '../../lib/styles.js'

function PreferenceToggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <div className="pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className="w-10 h-6 rounded-full relative transition-colors"
          style={{
            backgroundColor: checked ? colors.successBg : colors.bgTertiary,
          }}
        >
          <div
            className="w-4 h-4 rounded-full absolute top-1 transition-all"
            style={{
              backgroundColor: colors.bgPrimary,
              left: checked ? '22px' : '4px',
            }}
          />
        </div>
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm" style={{ color: colors.textPrimary }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          {description}
        </p>
      </div>
    </label>
  )
}

export default PreferenceToggle
