import { useEffect } from 'react'
import { Text, AccessibilityInfo } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSlowPending } from '@gym/shared'
import ErrorMessage from './ErrorMessage'
import { colors } from '../../lib/styles'

/**
 * Status line of an action the user waits for inside a modal: a slow-connection notice once it has
 * been pending for a while, or its failure. Inline and not a toast: the toast paints under a React
 * Native `Modal` (issue #121). `className` lands on whatever it renders, so its margin only takes
 * room when there is something to say.
 */
export default function SaveStatus({ isPending, error, className = '' }) {
  const { t } = useTranslation()
  const isSlow = useSlowPending(isPending)
  const isFailed = !isPending && !!error
  const message = isSlow ? t('common:network.slowRetrying') : isFailed ? error : null

  // Parity with the web live region: the notice cannot be silent for VoiceOver/TalkBack
  // (`accessibilityLiveRegion` alone only works on Android), and the failure no longer has a toast.
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message)
  }, [message])

  if (isSlow) {
    return (
      <Text className={`text-sm ${className}`} style={{ color: colors.textSecondary }}>
        {message}
      </Text>
    )
  }
  if (isFailed) return <ErrorMessage message={error} className={className} />
  return null
}
