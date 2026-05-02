import { useTranslation } from 'react-i18next'
import { CHART_RANGES } from '@gym/shared'
import { colors } from '../../lib/styles.js'

const OPTIONS = [
  { value: CHART_RANGES.ONE_MONTH, key: '1m' },
  { value: CHART_RANGES.THREE_MONTHS, key: '3m' },
  { value: CHART_RANGES.ALL, key: 'all' },
]

function ChartRangeToggle({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="flex rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
      {OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
            style={{
              backgroundColor: active ? colors.success : 'transparent',
              color: active ? colors.bgPrimary : colors.textMuted,
            }}
          >
            {t(`common:chartRange.${opt.key}`)}
          </button>
        )
      })}
    </div>
  )
}

export default ChartRangeToggle
