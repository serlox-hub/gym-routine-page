import { View, ActivityIndicator } from 'react-native'
import { colors } from '../../lib/styles'

// `inline`: sin padding y pequeño, para vivir dentro de un botón (estado "cargando" de una
// acción). Por defecto sigue siendo el spinner de pantalla que ya usaban las vistas.
export default function LoadingSpinner({ className = '', fullScreen = true, inline = false }) {
  if (inline) {
    return <ActivityIndicator size="small" color={colors.textSecondary} />
  }
  return (
    <View className={`items-center justify-center p-8 ${fullScreen ? 'flex-1' : ''} ${className}`}>
      <ActivityIndicator size="large" color={colors.textSecondary} />
    </View>
  )
}
