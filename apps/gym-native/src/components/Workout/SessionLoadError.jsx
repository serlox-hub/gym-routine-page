import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Button, ErrorMessage, PageHeader } from '../ui'
import AbandonSessionModal from './AbandonSessionModal'

// The session screen when its exercises failed to load and nothing loaded is left to show (issue
// #228). Retry leads: the session is usually fine and the network is not. Abandon stays, behind its
// confirmation, for a session that really is broken. No retrying state: a retry with no data puts
// the query back to pending, and the layout swaps this screen for its spinner.
export default function SessionLoadError({ title, onBack, onRetry, abandon }) {
  const { t } = useTranslation()

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title={title} onBack={onBack} />
      <View className="px-4">
        <ErrorMessage message={t('workout:session.loadFailed')} className="mb-4" />
        <View className="gap-3">
          <Button onPress={onRetry}>{t('common:buttons.retry')}</Button>
          <Button variant="secondary" onPress={abandon.open}>{t('workout:session.abandon')}</Button>
        </View>
      </View>
      <AbandonSessionModal abandon={abandon} />
    </SafeAreaView>
  )
}
