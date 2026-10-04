import { colors } from '../../lib/styles.js'

/**
 * Selectable chip of the exercise filters. `fillTouchTarget` makes the button 44 tall (h-11)
 * around the same visible chip, for a row where nothing else gives it a tappable height.
 */
function FilterChip({ label, isSelected, dot, onClick, fillTouchTarget = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`shrink-0 flex items-center ${fillTouchTarget ? 'h-11' : ''}`}
    >
      <span
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
        style={{
          backgroundColor: isSelected ? colors.successBgSubtle : colors.bgTertiary,
          color: isSelected ? colors.success : colors.textSecondary,
          border: `1px solid ${isSelected ? colors.success : 'transparent'}`,
        }}
      >
        {dot && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />}
        {label}
      </span>
    </button>
  )
}

export default FilterChip
