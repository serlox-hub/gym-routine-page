import { View, Text } from 'react-native'
import { colors } from '../../lib/styles'

export default function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <View className="items-center justify-center p-8">
      {Icon && <Icon size={48} color={colors.textSecondary} />}
      {title && (
        <Text className="text-primary text-lg font-semibold mt-4 text-center">{title}</Text>
      )}
      {description && (
        <Text className="text-secondary text-sm mt-2 text-center">{description}</Text>
      )}
      {children && <View className="mt-4">{children}</View>}
    </View>
  )
}
