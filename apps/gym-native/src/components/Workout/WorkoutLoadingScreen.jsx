import { Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '../ui'

export default function WorkoutLoadingScreen() {
  const { t } = useTranslation()
  return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center">
      <LoadingSpinner fullScreen={false} />
      <Text className="text-secondary text-sm mt-3">{t('common:buttons.loading')}</Text>
    </SafeAreaView>
  )
}
