import { View, Text, Pressable } from 'react-native'

export default function LoginScreen({ navigation }) {
  return (
    <View className="flex-1 items-center justify-center bg-surface px-6">
      <Text className="text-primary text-2xl font-bold mb-2">Diario Gym</Text>
      <Text className="text-secondary mb-8">Inicia sesión para continuar</Text>
      <Text className="text-secondary text-sm">(Pantalla de login - Fase 1)</Text>
      <Pressable
        onPress={() => navigation.navigate('Signup')}
        className="mt-4"
      >
        <Text className="text-accent">¿No tienes cuenta? Regístrate</Text>
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate('ForgotPassword')}
        className="mt-2"
      >
        <Text className="text-secondary text-sm">¿Olvidaste tu contraseña?</Text>
      </Pressable>
    </View>
  )
}
