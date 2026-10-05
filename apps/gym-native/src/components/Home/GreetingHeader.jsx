import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react-native'
import { getGreetingKey } from '@gym/shared'
import { useAuth } from '../../hooks/useAuth'
import { IconButton } from '../ui'
import { colors } from '../../lib/styles'

function GreetingHeader({ navigation }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const greetingKey = getGreetingKey(new Date().getHours())
  const userName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || ''

  return (
    <View className="flex-row items-start justify-between mb-4">
      <View>
        <Text className="text-sm" style={{ color: colors.textSecondary }}>
          {t(greetingKey)}
        </Text>
        <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          {userName}
        </Text>
      </View>
      <IconButton
        icon={Settings}
        iconSize={20}
        filled
        label={t('common:preferences.title')}
        onPress={() => navigation.navigate('Preferences')}
      />
    </View>
  )
}

export default GreetingHeader
