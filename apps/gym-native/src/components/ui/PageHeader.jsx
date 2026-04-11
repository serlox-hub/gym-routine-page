import { View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import DropdownMenu from './DropdownMenu'
import { colors } from '../../lib/styles'

export default function PageHeader({
  title,
  titleExtra,
  onBack,
  menuItems,
  rightAction,
  children,
}) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigation.goBack()
    }
  }

  return (
    <View
      className="bg-surface px-4 pb-4"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Pressable onPress={handleBack} className="flex-row items-center gap-1 -ml-1 active:opacity-70">
            <ChevronLeft size={18} color={colors.textPrimary} />
            {!title && (
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '500' }}>
                {t('common:buttons.back')}
              </Text>
            )}
          </Pressable>
          <Text className="text-primary text-xl font-bold flex-shrink" numberOfLines={1}>
            {title}
          </Text>
          {titleExtra}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {rightAction}
          {menuItems && menuItems.length > 0 && (
            <DropdownMenu items={menuItems} />
          )}
        </View>
      </View>
      {children}
    </View>
  )
}
