import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  explainRecommendation,
  formatRecommendationReason,
  formatAlternativeWhy,
  formatChoiceDaysNote,
  groupTemplateChoices,
} from '@gym/shared'
import { colors, design } from '../../lib/styles'
import OnboardingTemplateCard from './OnboardingTemplateCard'

const sectionTitleStyle = { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 4 }

/**
 * Onboarding's last step: the recommended template with why it is the user's, up to two
 * alternatives with why one might prefer them, and every other template behind "see all", so any
 * of them can still be picked. `recommendation` is what `recommendTemplate` returned.
 */
export default function OnboardingRecommendationStep({ answers, recommendation, activeId, onSelect }) {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const explanation = explainRecommendation(answers, recommendation)
  const { recommended, alternatives, others } = groupTemplateChoices(recommendation.templateId, explanation.alternatives)
  // Coming back to this step after picking one of the rest must not hide the pick.
  const showOthers = showAll || others.some(tpl => tpl.id === activeId)

  const renderCard = (template, description) => (
    <OnboardingTemplateCard
      key={template.id}
      template={template}
      description={description}
      isSelected={activeId === template.id}
      isRecommended={template.id === recommended.id}
      daysNote={formatChoiceDaysNote(template, recommended.id, answers.diasPorSemana, t)}
      onSelect={() => onSelect(template.id)}
    />
  )

  return (
    <>
      <View>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{t('routine:onboarding.recommendedTitle')}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{t('routine:onboarding.recommendedSubtitle')}</Text>
      </View>

      {renderCard(recommended, formatRecommendationReason(explanation, recommended, t))}

      {alternatives.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={sectionTitleStyle}>{t('routine:onboarding.alternativesTitle')}</Text>
          {alternatives.map(alternative => renderCard(alternative.template, formatAlternativeWhy(alternative, t)))}
        </View>
      )}

      {others.length > 0 && (showOthers ? (
        <View style={{ gap: 8 }}>
          <Text style={sectionTitleStyle}>{t('routine:onboarding.othersTitle')}</Text>
          {others.map(template => renderCard(template, null))}
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setShowAll(true)}
          style={{ minHeight: design.minTouchTarget, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>{t('routine:onboarding.seeAll')}</Text>
        </Pressable>
      ))}
    </>
  )
}
