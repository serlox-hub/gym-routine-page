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
          <p style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
            {t('common:preferences.trainingDaysPerWeek')}
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <button
                key={n}
                onClick={() => onChangeDays(n)}
                disabled={disabled}
                className="w-9 h-9 rounded-full text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: n === currentDays ? colors.success : colors.bgTertiary,
                  color: n === currentDays ? colors.bgPrimary : colors.textMuted,
                }}
              >
                {n}
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
