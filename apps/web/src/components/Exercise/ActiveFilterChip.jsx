import { X } from 'lucide-react'
import { colors } from '../../lib/styles.js'

/**
 * An active filter shown under the search field. The whole chip clears it, and the button is
 * 44 tall (h-11) around the small visible chip.
 */
function ActiveFilterChip({ label, onClear }) {
  return (
    <button type="button" onClick={onClear} className="h-11 flex items-center hover:opacity-70">
      <span
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
        style={{ backgroundColor: colors.successBgSubtle, color: colors.success }}
      >
        {label}
        <X size={10} />
      </span>
    </button>
  )
}

export default ActiveFilterChip
