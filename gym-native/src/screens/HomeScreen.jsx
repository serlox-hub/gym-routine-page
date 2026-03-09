import { View, Text, Pressable } from 'react-native'
import { useAuth } from '../hooks/useAuth'

export default function HomeScreen() {
  const { user, logout } = useAuth()

  return (
    <View className="flex-1 items-center justify-center bg-surface px-6">
      <Text className="text-primary text-2xl font-bold mb-2">Diario Gym</Text>
      <Text className="text-secondary mb-4">
        Bienvenido, {user?.email ?? 'usuario'}
      </Text>
      <Text className="text-secondary text-sm mb-8">(Pantalla home - Fase 3)</Text>
      <Pressable
        onPress={logout}
        className="bg-surface-block px-6 py-3 rounded-lg"
      >
        <Text className="text-danger">Cerrar Sesión</Text>
      </Pressable>
    </View>
  )
}
