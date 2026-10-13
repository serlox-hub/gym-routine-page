import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  explainRecommendation,
  formatRecommendationReason,
  formatAlternativeWhy,
  formatChoiceDaysNote,
  groupTemplateChoices,
} from '@gym/shared'
import { colors } from '../../lib/styles.js'
import OnboardingTemplateCard from './OnboardingTemplateCard.jsx'

const sectionTitleStyle = { color: colors.textMuted, fontSize: 12, fontWeight: 600, marginTop: 4 }

/**
 * Onboarding's last step: the recommended template with why it is the user's, up to two
 * alternatives with why one might prefer them, and every other template behind "see all", so any
 * of them can still be picked. `recommendation` is what `recommendTemplate` returned.
 */
function OnboardingRecommendationStep({ answers, recommendation, activeId, onSelect }) {
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
      <div>
        <h3 style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700 }}>{t('routine:onboarding.recommendedTitle')}</h3>
        <p style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{t('routine:onboarding.recommendedSubtitle')}</p>
      </div>

      {renderCard(recommended, formatRecommendationReason(explanation, recommended, t))}

      {alternatives.length > 0 && (
        <div className="flex flex-col gap-2">
          <p style={sectionTitleStyle}>{t('routine:onboarding.alternativesTitle')}</p>
          {alternatives.map(alternative => renderCard(alternative.template, formatAlternativeWhy(alternative, t)))}
        </div>
      )}

      {others.length > 0 && (showOthers ? (
        <div className="flex flex-col gap-2">
          <p style={sectionTitleStyle}>{t('routine:onboarding.othersTitle')}</p>
          {others.map(template => renderCard(template, null))}
        </div>
      ) : (
        <button type="button" onClick={() => setShowAll(true)}
          className="w-full min-h-11 rounded-xl text-sm font-medium hover:opacity-80"
          style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}>
          {t('routine:onboarding.seeAll')}
        </button>
      ))}
    </>
  )
}

export default OnboardingRecommendationStep
