import { View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { GripVertical } from 'lucide-react-native'
import { colors, design } from '../../lib/styles'

// What the handle took around its icon before it grew to the touch-target box.
const LAYOUT_PADDING = 4

// Asa de arrastre de una fila reordenable: el ÚNICO punto que lleva el gesto, para que el resto de
// la fila conserve sus pulsaciones y siga scrolleando la pantalla con el dedo.
// `dragHandleProps` es el paquete opaco que entrega `DraggableList`; quien pinta la fila no sabe
// qué lleva dentro ni importa nada de `react-native-gesture-handler`.
//
// `onPressStart`/`onPressEnd` avisan al TOCAR el asa, no al activarse el arrastre, y lo hacen desde
// los callbacks del responder de RN, que son SÍNCRONOS. Una fila que además tiene swipe para borrar
// lo usa para bloquearlo: su clasificación ocurre dentro de `onMoveShouldSetPanResponder`, que ya
// habría leído la bandera cuando llegase un `runOnJS` desde el `onStart` del pan.
export default function DragHandle({ dragHandleProps, disabled = false, size = 16, onPressStart, onPressEnd }) {
  if (!dragHandleProps) return null
  // 44pt de zona táctil mida lo que mida el icono, sin mover el icono: el margen negativo devuelve
  // al layout el tamaño de antes (icono + 2*4).
  const padding = (design.minTouchTarget - size) / 2

  return (
    <GestureDetector gesture={dragHandleProps.gesture}>
      <View
        // El asa reclama el toque para que el `Pressable` de la `Card` que la contiene no lo
        // reciba: sin esto, tocar el asa (o mantenerla pulsada sin llegar a mover) pliega la
        // tarjeta, porque RNGH solo cancela ese toque cuando el pan ACTIVA, y eso pide recorrido.
        // No afecta al pan: vive fuera del sistema de responder de RN. Equivale al
        // `stopPropagation` del asa de web.
        onStartShouldSetResponder={() => {
          onPressStart?.()
          return true
        }}
        onResponderRelease={() => onPressEnd?.()}
        onResponderTerminate={() => onPressEnd?.()}
        // Con tamaño real y no con `hitSlop`, porque el pan de RNGH mide la caja de la vista y no
        // está verificado que respete el `hitSlop` de RN.
        style={{ padding, margin: -(padding - LAYOUT_PADDING), opacity: disabled ? 0.4 : 1 }}
      >
        <GripVertical size={size} color={colors.textSecondary} />
      </View>
    </GestureDetector>
  )
}
