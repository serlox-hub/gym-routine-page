import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Copy } from 'lucide-react-native'
import { PROMPT_CATALOG_STATUS } from '@gym/shared'
import { LoadingSpinner } from '../ui'
import { colors, design } from '../../lib/styles'

const LOADING_OPACITY = 0.4

// Copy button of the AI prompts. The prompt carries the exercise catalog (#159), so it copies only
// once the catalog has loaded: busy while it loads, blocked when it failed (pressing it retries and
// says why, inline, since a toast paints under a React Native Modal). On the solid lime only the
// content is dimmed: translucent lime turns olive.
export default function CopyPromptButton({ status, onCopy, onRetry }) {
  const { t } = useTranslation()
  const [showError, setShowError] = useState(false)
  const isLoading = status === PROMPT_CATALOG_STATUS.LOADING
  const isBlocked = status === PROMPT_CATALOG_STATUS.ERROR

  const handlePress = () => {
    if (!isBlocked) return onCopy()
    setShowError(true)
    onRetry()
  }

  return (
    <View style={{ gap: 8 }}>
      {isBlocked && showError ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>{t('routine:chatbot.catalogLoadError')}</Text>
      ) : null}
      <Pressable onPress={handlePress} disabled={isLoading}
        accessibilityRole="button" accessibilityState={{ disabled: isLoading, busy: isLoading }}
        style={{ flexDirection: 'row', backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', opacity: isLoading ? LOADING_OPACITY : 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: isBlocked ? design.blockedOpacity : 1 }}>
          {isLoading ? <LoadingSpinner inline /> : <Copy size={16} color={colors.bgPrimary} />}
          <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:chatbot.copyPrompt')}</Text>
        </View>
      </Pressable>
    </View>
  )
}
