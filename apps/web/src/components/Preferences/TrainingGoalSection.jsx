import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Card } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import PreferenceToggle from './PreferenceToggle.jsx'

function TrainingGoalSection({ preferences, onChangeDays, onChangeCycleLength, onToggleWidget, disabled }) {
  const { t } = useTranslation()
  const currentDays = preferences?.training_days_per_week
  const currentCycleLength = preferences?.training_cycle_length || 7
  const showWidget = preferences?.show_training_goal ?? true

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-4" style={{ color: colors.textSecondary }}>
        {t('common:preferences.trainingGoalTitle')}
      </h2>

      <div className="space-y-4">
        <div>
          <p className="font-medium text-sm mb-2" style={{ color: colors.textPrimary }}>
            {t('common:preferences.cycleLengthDays')}
          </p>
          <div className="flex gap-1 flex-wrap">
            {[7, 8, 9, 10, 11, 12, 13, 14].map(n => (
              <button
                key={n}
                onClick={() => onChangeCycleLength(n)}
                disabled={disabled}
                className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: n === currentCycleLength ? colors.accent : colors.bgTertiary,
                  color: n === currentCycleLength ? colors.white : colors.textSecondary,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-medium text-sm mb-2" style={{ color: colors.textPrimary }}>
            {t('common:preferences.trainingDaysPerCycle')}
          </p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: currentCycleLength }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => onChangeDays(n)}
                disabled={disabled}
                className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: n === currentDays ? colors.accent : colors.bgTertiary,
                  color: n === currentDays ? colors.white : colors.textSecondary,
                }}
              >
                {n}
              </button>
            ))}
            {currentDays && (
              <button
                onClick={() => onChangeDays(null)}
                disabled={disabled}
                className="w-9 h-9 rounded-lg text-sm transition-colors flex items-center justify-center"
                style={{
                  backgroundColor: colors.bgTertiary,
                  color: colors.textSecondary,
                }}
                title={t('common:preferences.removeGoal')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <PreferenceToggle
          label={t('common:preferences.showWidgetHome')}
          description={t('common:preferences.showWidgetHomeDescription')}
          checked={showWidget}
          onChange={onToggleWidget}
          disabled={disabled}
        />
      </div>
    </Card>
  )
}

export default TrainingGoalSection
