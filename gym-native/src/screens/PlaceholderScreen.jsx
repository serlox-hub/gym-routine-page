import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'

export default function PlaceholderScreen({ navigation, route }) {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <Pressable
        onPress={() => navigation.goBack()}
        className="flex-row items-center gap-2 px-4 pt-2 pb-3"
      >
        <ChevronLeft size={24} color="#8b949e" />
        <Text className="text-secondary">Volver</Text>
      </Pressable>
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-primary text-xl font-bold mb-2">{route.name}</Text>
        <Text className="text-secondary text-center">
          Pantalla pendiente de migración
        </Text>
      </View>
    </SafeAreaView>
  )
}
