import { GripVertical } from 'lucide-react'
import { colors } from '../../lib/styles.js'

// Asa de arrastre de una fila reordenable: el ÚNICO punto que lleva los listeners del gesto, para
// que el resto de la fila conserve sus pulsaciones y siga scrolleando la página con el dedo.
// `dragHandleProps` es el paquete opaco que entrega `SortableList`; quien pinta la fila no sabe
// qué lleva dentro ni importa nada de la librería de arrastre.
function DragHandle({ dragHandleProps, disabled = false, size = 16 }) {
  if (!dragHandleProps) return null

  const { style: handleStyle, ...listeners } = dragHandleProps

  return (
    <button
      type="button"
      // La cabecera entera pliega y despliega la tarjeta: el asa no puede arrastrar ese clic.
      onClick={(e) => e.stopPropagation()}
      {...listeners}
      // Después del spread a propósito: el arrastre no es el camino accesible (lo es la lista de
      // posiciones del menú) y no hay sensor de teclado, así que dejarla enfocable con el
      // `role`/`tabIndex` que pone dnd-kit daría una parada de tabulación que no hace nada.
      aria-hidden="true"
      tabIndex={-1}
      disabled={disabled}
      style={{
        ...handleStyle,
        display: 'flex',
        padding: 4,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : handleStyle?.cursor,
      }}
    >
      <GripVertical size={size} color={colors.textSecondary} />
    </button>
  )
}

export default DragHandle
