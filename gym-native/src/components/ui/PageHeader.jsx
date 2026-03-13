import { View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import DropdownMenu from './DropdownMenu'

export default function PageHeader({
  title,
  titleExtra,
  onBack,
  menuItems,
  children,
}) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

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
          <Pressable onPress={handleBack} className="p-1 -ml-1 active:opacity-70">
            <ChevronLeft size={24} color="#8b949e" />
          </Pressable>
          <Text className="text-primary text-xl font-bold flex-shrink" numberOfLines={1}>
            {title}
          </Text>
          {titleExtra}
        </View>
        {menuItems && menuItems.length > 0 && (
          <DropdownMenu items={menuItems} />
        )}
      </View>
      {children}
    </View>
  )
}
