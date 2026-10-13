import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_GOALS, toggleGoal, getGoalChips, formatGoalGuidance } from '@gym/shared'
import { colors, design } from '../../lib/styles.js'
import OnboardingNote from './OnboardingNote.jsx'

/**
 * Onboarding goal step: up to MAX_GOALS chips. What each chip shows comes from `getGoalChips`: a
 * dimmed chip still answers, at the maximum with a note saying so, and a goal with no routine of
 * its own gets marked and then a note says why and which routine is recommended instead.
 */
function OnboardingGoalStep({ answers, recommendedTemplate, onChange }) {
  const { t } = useTranslation()
  const [showMaxNotice, setShowMaxNotice] = useState(false)
  const chips = getGoalChips(answers)

  const handlePress = chip => {
    setShowMaxNotice(chip.isBlocked)
    if (!chip.isBlocked) onChange(toggleGoal(answers.objetivos, chip.value))
  }

  return (
    <>
      <div>
        <p style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>{t('routine:onboarding.goalQuestion')}</p>
        <p style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{t('routine:onboarding.goalHint', { max: MAX_GOALS })}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map(chip => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={chip.isSelected}
            aria-disabled={chip.isBlocked}
            onClick={() => handlePress(chip)}
            className="min-h-11 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
            style={{
              backgroundColor: chip.isSelected ? colors.successBg : colors.bgTertiary,
              border: `1px solid ${chip.isSelected ? colors.success : colors.border}`,
              color: chip.isSelected ? colors.success : colors.textPrimary,
              opacity: chip.isDimmed ? design.blockedOpacity : 1,
            }}
          >
            {t(chip.labelKey)}
          </button>
        ))}
      </div>
      {showMaxNotice && <OnboardingNote>{t('routine:onboarding.goalMaxReached', { max: MAX_GOALS })}</OnboardingNote>}
      {chips.filter(chip => chip.isSelected && chip.guidance).map(chip => (
        <OnboardingNote key={chip.value}>{formatGoalGuidance(chip.guidance, recommendedTemplate, t)}</OnboardingNote>
      ))}
    </>
  )
}

export default OnboardingGoalStep
