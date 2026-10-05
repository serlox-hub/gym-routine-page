import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'
import { Switch } from '../ui/index.js'

function TrainingGoalSection({ preferences, onChangeDays, onToggleWidget, disabled, highlight }) {
  const { t } = useTranslation()
  const currentDays = preferences?.training_days_per_week
  const showWidget = preferences?.show_training_goal ?? true

  return (
    <section>
      <span style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
        {t('common:preferences.trainingGoalTitle')}
      </span>
      <div
        className="rounded-xl transition-all duration-500"
        style={{
          backgroundColor: colors.bgSecondary,
          border: highlight ? `2px solid ${colors.success}` : `1px solid ${colors.border}`,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          {/* 6, not 10: the 44px box puts 4 more above the circle. */}
          <p style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
            {t('common:preferences.trainingDaysPerWeek')}
          </p>
          {/* Seven 44px-wide options do not fit a 360px phone: each one is 44 tall and takes its
              share of the row, and the circle inside is 36 at most, smaller if the share is. */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <button
                key={n}
                onClick={() => onChangeDays(n)}
                disabled={disabled}
                className="flex-1 min-w-0 h-11 flex items-center justify-center"
              >
                <span
                  className="w-full max-w-9 aspect-square rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: n === currentDays ? colors.success : colors.bgTertiary,
                    color: n === currentDays ? colors.bgPrimary : colors.textMuted,
                  }}
                >
                  {n}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500 }}>
              {t('common:preferences.showWidgetHome')}
            </p>
            <p style={{ color: colors.textMuted, fontSize: 12 }}>
              {t('common:preferences.showWidgetHomeDescription')}
            </p>
          </div>
          <Switch
            checked={showWidget}
            onChange={onToggleWidget}
            disabled={disabled}
            accessibilityLabel={t('common:preferences.showWidgetHome')}
          />
        </div>
      </div>
    </section>
  )
}

export default TrainingGoalSection
