import { useTranslation } from 'react-i18next'
import { CHART_RANGES } from '@gym/shared'
import { colors } from '../../lib/styles.js'

const OPTIONS = [
  { value: CHART_RANGES.ONE_MONTH, key: '1m' },
  { value: CHART_RANGES.THREE_MONTHS, key: '3m' },
  { value: CHART_RANGES.ALL, key: 'all' },
]

// The buttons are the 44px boxes; the track and the active pill are painted inside them at their
// old 24px height (inset-y-2.5), so the toggle looks the same and takes 10px more above and below.
function ChartRangeToggle({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="relative flex">
      <div className="absolute inset-x-0 inset-y-2.5 rounded-lg" style={{ backgroundColor: colors.bgTertiary }} />
      {OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative min-h-11 flex items-center"
          >
            <span
              className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
              style={{
                backgroundColor: active ? colors.success : 'transparent',
                color: active ? colors.bgPrimary : colors.textMuted,
              }}
            >
              {t(`common:chartRange.${opt.key}`)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default ChartRangeToggle
