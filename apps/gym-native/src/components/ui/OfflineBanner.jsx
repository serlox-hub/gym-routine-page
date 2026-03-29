import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react-native'
import NetInfo from '@react-native-community/netinfo'
import { colors } from '../../lib/styles'

function OfflineBanner() {
  const { t } = useTranslation()
  const [isOnline, setIsOnline] = useState(true)
  const { top } = useSafeAreaInsets()

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true)
    })
    return unsubscribe
  }, [])

  if (isOnline) return null

  return (
    <View
      className="flex-row items-center justify-center gap-2 px-4"
      style={{ backgroundColor: colors.danger, paddingTop: top + 4, paddingBottom: 4 }}
    >
      <WifiOff size={14} color={colors.white} />
      <Text className="text-xs font-medium" style={{ color: colors.white }}>
        {t('common:offline.banner')}
      </Text>
    </View>
  )
}

export default OfflineBanner
