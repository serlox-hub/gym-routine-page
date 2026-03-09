import { View, Text, Pressable } from 'react-native'

export default function ForgotPasswordScreen({ navigation }) {
  return (
    <View className="flex-1 items-center justify-center bg-surface px-6">
      <Text className="text-primary text-2xl font-bold mb-2">Recuperar Contraseña</Text>
      <Text className="text-secondary mb-8">(Pantalla de recuperación - Fase 1)</Text>
      <Pressable onPress={() => navigation.goBack()}>
        <Text className="text-accent">Volver al login</Text>
      </Pressable>
    </View>
  )
}
