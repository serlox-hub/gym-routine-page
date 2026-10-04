import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import DropdownMenu from './DropdownMenu'
import IconButton from './IconButton'
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
  const { t } = useTranslation()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigation.goBack()
    }
  }

  return (
    <View className="bg-surface px-4 pt-2 pb-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2 flex-1">
          <IconButton
            icon={ChevronLeft}
            iconSize={20}
            color={colors.textPrimary}
            label={t('common:buttons.back')}
            onPress={handleBack}
          />
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
