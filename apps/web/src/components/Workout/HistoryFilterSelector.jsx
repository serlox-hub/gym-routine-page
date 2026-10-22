import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'

// Literal class names, so Tailwind keeps both: the "this routine" segment can be missing.
const GRID_COLUMNS = { 2: 'grid-cols-2', 3: 'grid-cols-3' }

/**
 * The exercise history's routine filter: equal segments filling the row, with a lime pill sliding
 * under the selected one. `options` come from `getHistoryFilterOptions`.
 */
function HistoryFilterSelector({ options, value, onChange }) {
  const { t } = useTranslation()
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))

  return (
    // The buttons are the 44px boxes; the track and the pill are painted behind them at their old
    // size (inset-y-2 = 28px track). The pill is one column wide: the row minus its 2px sides.
    <div className={`grid ${GRID_COLUMNS[options.length]} px-0.5 relative`}>
      <div className="absolute inset-x-0 inset-y-2 rounded-full" style={{ backgroundColor: colors.bgTertiary }} />
      <div
        className="absolute top-2.5 bottom-2.5 rounded-full transition-transform duration-200 ease-in-out"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          backgroundColor: colors.success,
          left: 2,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map(option => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className="relative z-10 min-h-11 px-2 text-xs font-semibold whitespace-nowrap"
            style={{ color: isSelected ? colors.bgPrimary : colors.textSecondary }}
          >
            {t(option.labelKey)}
          </button>
        )
      })}
    </div>
  )
}

export default HistoryFilterSelector
