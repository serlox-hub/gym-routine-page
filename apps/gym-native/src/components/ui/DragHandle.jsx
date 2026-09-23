import { View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { GripVertical } from 'lucide-react-native'
import { colors } from '../../lib/styles'

// Asa de arrastre de una fila reordenable: el ÚNICO punto que lleva el gesto, para que el resto
// de la fila conserve sus pulsaciones y siga scrolleando la pantalla con el dedo.
// `dragHandleProps` es el paquete opaco que entrega `DraggableList`; quien pinta la fila no sabe
// qué lleva dentro ni importa nada de `react-native-gesture-handler`.
export default function DragHandle({ dragHandleProps, disabled = false, size = 16 }) {
  if (!dragHandleProps) return null

  return (
    <GestureDetector gesture={dragHandleProps.gesture}>
      <View
        hitSlop={8}
        // El asa reclama el toque para que el `Pressable` de la `Card` que la contiene no lo
        // reciba: sin esto, tocar el asa (o mantenerla pulsada sin llegar a mover) pliega la
        // tarjeta, porque RNGH solo cancela ese toque cuando el pan ACTIVA, y eso pide recorrido.
        // No afecta al pan: vive fuera del sistema de responder de RN. Equivale al
        // `stopPropagation` del asa de web.
        onStartShouldSetResponder={() => true}
        style={{ padding: 4, opacity: disabled ? 0.4 : 1 }}
      >
        <GripVertical size={size} color={colors.textSecondary} />
      </View>
    </GestureDetector>
  )
}
