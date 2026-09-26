import { GripVertical } from 'lucide-react'
import { colors } from '../../lib/styles.js'

// Asa de arrastre de una fila reordenable: el ÚNICO punto que lleva los listeners del gesto, para
// que el resto de la fila conserve sus pulsaciones y siga scrolleando la página con el dedo.
// `dragHandleProps` es el paquete opaco que entrega `SortableList`; quien pinta la fila no sabe
// qué lleva dentro ni importa nada de la librería de arrastre.
//
// `onPressStart`/`onPressEnd` avisan al TOCAR el asa, no al activarse el arrastre: una fila que
// además tiene swipe para borrar lo usa para bloquearlo, y el swipe se clasifica en el primer
// `pointermove`, antes de que dnd-kit haya recorrido su distancia de activación.
function DragHandle({ dragHandleProps, disabled = false, size = 16, onPressStart, onPressEnd }) {
  if (!dragHandleProps) return null

  const { style: handleStyle, onPointerDown: dndPointerDown, ...listeners } = dragHandleProps

  const handlePointerDown = (e) => {
    onPressStart?.()
    if (onPressEnd) {
      // La suelta se escucha en `window`, no en el asa: el puntero se levanta casi siempre lejos
      // de ella, y un `onPointerUp` del botón dejaría el bloqueo puesto para siempre (la fila no
      // volvería a reclamar un swipe hasta remontarse).
      const release = () => {
        window.removeEventListener('pointerup', release)
        window.removeEventListener('pointercancel', release)
        onPressEnd()
      }
      window.addEventListener('pointerup', release)
      window.addEventListener('pointercancel', release)
    }
    dndPointerDown?.(e)
  }

  return (
    <button
      type="button"
      // La cabecera entera pliega y despliega la tarjeta: el asa no puede arrastrar ese clic.
      onClick={(e) => e.stopPropagation()}
      {...listeners}
      onPointerDown={handlePointerDown}
      // Después del spread a propósito: el arrastre no es el camino accesible (lo es la lista de
      // posiciones del menú) y no hay sensor de teclado, así que dejarla enfocable con el
      // `role`/`tabIndex` que pone dnd-kit daría una parada de tabulación que no hace nada.
      aria-hidden="true"
      tabIndex={-1}
      disabled={disabled}
      style={{
        ...handleStyle,
        display: 'flex',
        // 44px de zona táctil (lo mínimo cómodo para un dedo) sin mover el icono: el margen negativo
        // devuelve al layout el tamaño de antes (16 + 2*4).
        padding: 14,
        margin: -10,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : handleStyle?.cursor,
      }}
    >
      <GripVertical size={size} color={colors.textSecondary} />
    </button>
  )
}

export default DragHandle
