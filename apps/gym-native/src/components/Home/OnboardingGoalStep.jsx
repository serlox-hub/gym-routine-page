import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MAX_GOALS, toggleGoal, getGoalChips, formatGoalGuidance } from '@gym/shared'
import { colors, design } from '../../lib/styles'
import OnboardingNote from './OnboardingNote'

/**
 * Onboarding goal step: up to MAX_GOALS chips. What each chip shows comes from `getGoalChips`: a
 * dimmed chip still answers, at the maximum with a note saying so, and a goal with no routine of
 * its own gets marked and then a note says why and which routine is recommended instead.
 */
export default function OnboardingGoalStep({ answers, recommendedTemplate, onChange }) {
  const { t } = useTranslation()
  const [showMaxNotice, setShowMaxNotice] = useState(false)
  const chips = getGoalChips(answers)

  const handlePress = chip => {
    setShowMaxNotice(chip.isBlocked)
    if (!chip.isBlocked) onChange(toggleGoal(answers.objetivos, chip.value))
  }

  return (
    <>
      <View>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{t('routine:onboarding.goalQuestion')}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{t('routine:onboarding.goalHint', { max: MAX_GOALS })}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {chips.map(chip => (
          <Pressable
            key={chip.value}
            accessibilityRole="button"
            accessibilityState={{ selected: chip.isSelected, disabled: chip.isBlocked }}
            onPress={() => handlePress(chip)}
            style={{
              minHeight: design.minTouchTarget,
              justifyContent: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: chip.isSelected ? colors.successBg : colors.bgTertiary,
              borderWidth: 1,
              borderColor: chip.isSelected ? colors.success : colors.border,
              opacity: chip.isDimmed ? design.blockedOpacity : 1,
            }}
          >
            <Text style={{ fontSize: 13, color: chip.isSelected ? colors.success : colors.textPrimary }}>{t(chip.labelKey)}</Text>
          </Pressable>
        ))}
      </View>
      {showMaxNotice && <OnboardingNote>{t('routine:onboarding.goalMaxReached', { max: MAX_GOALS })}</OnboardingNote>}
      {chips.filter(chip => chip.isSelected && chip.guidance).map(chip => (
        <OnboardingNote key={chip.value}>{formatGoalGuidance(chip.guidance, recommendedTemplate, t)}</OnboardingNote>
      ))}
    </>
  )
}
