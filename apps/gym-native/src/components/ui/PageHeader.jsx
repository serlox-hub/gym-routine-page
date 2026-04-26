import { View, Text, Pressable } from 'react-native'
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
          <Pressable onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} className="-ml-1 active:opacity-70" style={{ padding: 4 }}>
            <ChevronLeft size={20} color={colors.textPrimary} />
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
