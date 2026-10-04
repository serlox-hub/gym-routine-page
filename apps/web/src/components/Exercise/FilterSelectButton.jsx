import { ChevronDown, X } from 'lucide-react'
import { colors } from '../../lib/styles.js'

/**
 * A filter that opens the full list of its options. Shows the filter's name while nothing is
 * picked; once something is, shows the pick, highlighted, with an "x" that clears it.
 */
function FilterSelectButton({ label, value, onOpen, onClear, clearLabel }) {
  const isActive = Boolean(value)

  return (
    <div
      className="flex-1 min-w-0 h-11 flex items-stretch rounded-lg"
      style={{
        backgroundColor: isActive ? colors.successBgSubtle : colors.bgTertiary,
        border: `1px solid ${isActive ? colors.success : colors.border}`,
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className={`flex-1 min-w-0 flex items-center gap-1 pl-3 text-sm ${isActive ? '' : 'pr-2'}`}
        style={{ color: isActive ? colors.success : colors.textSecondary }}
      >
        <span className="truncate">{value ?? label}</span>
        {!isActive && <ChevronDown size={14} className="shrink-0 ml-auto" />}
      </button>
      {isActive && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="w-11 shrink-0 flex items-center justify-center"
          style={{ color: colors.success }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export default FilterSelectButton
