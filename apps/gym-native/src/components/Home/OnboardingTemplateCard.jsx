import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check, Sparkles } from 'lucide-react-native'
import { getTemplateDisplay, getTemplateDayNames } from '@gym/shared'
import { colors } from '../../lib/styles'
import OnboardingNote from './OnboardingNote'

/**
 * A template in the onboarding's last step: name, tags and an optional line (why it is recommended,
 * or why one might prefer it). Selected, it opens its week and, when there is one, its days note.
 * Those go below the pressable, so its accessible name stays the template and not the whole week.
 */
export default function OnboardingTemplateCard({ template, description, isSelected, isRecommended, daysNote, onSelect }) {
  const { t } = useTranslation()
  const { name, tags } = getTemplateDisplay(template, t)

  return (
    <View style={{ borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: isSelected ? colors.success : colors.border }}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={onSelect} style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginTop: 2, borderColor: isSelected ? colors.success : colors.border, backgroundColor: isSelected ? colors.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {isSelected && <Check size={12} color={colors.bgPrimary} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{name}</Text>
              {isRecommended && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successBg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Sparkles size={10} color={colors.success} />
                  <Text style={{ color: colors.success, fontSize: 11, fontWeight: '600' }}>{t('routine:onboarding.recommendedBadge')}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {tags.map(tag => (
                <View key={tag} style={{ backgroundColor: colors.bgTertiary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{tag}</Text>
                </View>
              ))}
            </View>
            {description ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>{description}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      {isSelected && (
        <View style={{ gap: 10, paddingLeft: 46, paddingRight: 14, paddingBottom: 14 }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>{t('routine:onboarding.weekTitle')}</Text>
            <View style={{ gap: 4, marginTop: 6 }}>
              {getTemplateDayNames(template).map((dayName, index) => (
                <View key={index} style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13, width: 12, textAlign: 'right' }}>{index + 1}</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, flex: 1 }}>{dayName}</Text>
                </View>
              ))}
            </View>
          </View>
          {daysNote ? <OnboardingNote>{daysNote}</OnboardingNote> : null}
        </View>
      )}
    </View>
  )
}
