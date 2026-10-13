import { useTranslation } from 'react-i18next'
import { Check, Sparkles } from 'lucide-react'
import { getTemplateDisplay, getTemplateDayNames } from '@gym/shared'
import { colors } from '../../lib/styles.js'
import OnboardingNote from './OnboardingNote.jsx'

/**
 * A template in the onboarding's last step: name, tags and an optional line (why it is recommended,
 * or why one might prefer it). Selected, it opens its week and, when there is one, its days note.
 * Those go below the button, so its accessible name stays the template and not the whole week.
 */
function OnboardingTemplateCard({ template, description, isSelected, isRecommended, daysNote, onSelect }) {
  const { t } = useTranslation()
  const { name, tags } = getTemplateDisplay(template, t)

  return (
    <div className="rounded-xl transition-all" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${isSelected ? colors.success : colors.border}` }}>
      <button type="button" aria-pressed={isSelected} onClick={onSelect} className="w-full text-left" style={{ padding: '14px 16px' }}>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
            style={{ borderColor: isSelected ? colors.success : colors.border, backgroundColor: isSelected ? colors.success : 'transparent' }}>
            {isSelected && <Check size={12} color={colors.bgPrimary} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{name}</span>
              {isRecommended && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.successBg, color: colors.success, fontSize: 11, fontWeight: 600 }}>
                  <Sparkles size={10} /> {t('routine:onboarding.recommendedBadge')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}>{tag}</span>
              ))}
            </div>
            {description && (
              <span className="block mt-2" style={{ color: colors.textSecondary, fontSize: 12 }}>{description}</span>
            )}
          </div>
        </div>
      </button>

      {isSelected && (
        <div className="flex flex-col gap-2.5" style={{ padding: '0 16px 14px 48px' }}>
          <div>
            <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600 }}>{t('routine:onboarding.weekTitle')}</p>
            <ol className="flex flex-col gap-1 mt-1.5">
              {getTemplateDayNames(template).map((dayName, index) => (
                <li key={index} className="flex items-baseline gap-2" style={{ fontSize: 13 }}>
                  <span className="w-3 text-right shrink-0" style={{ color: colors.textMuted }}>{index + 1}</span>
                  <span style={{ color: colors.textPrimary }}>{dayName}</span>
                </li>
              ))}
            </ol>
          </div>
          {daysNote && <OnboardingNote>{daysNote}</OnboardingNote>}
        </div>
      )}
    </div>
  )
}

export default OnboardingTemplateCard
