import { useMemo } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { design } from '../../lib/styles.js'

// Lista vertical reordenable por arrastre. El arrastre SIEMPRE empieza en un asa: quien pinta
// cada fila recibe `dragHandleProps` y decide dónde ponerla, y el resto de la fila conserva sus
// pulsaciones y el scroll de la página. Es también lo que mantiene a los llamantes sin importar
// nada de `@dnd-kit`.
//
// El camino accesible sigue siendo la lista de posiciones del menú de cada fila, no esto.

// dnd-kit no renderiza contenedor propio: las filas quedan como hijas directas del layout que
// envuelve a la lista, así que el `gap` del padre sigue separándolas.
function SortableRow({ id, index, disabled, renderItem, item }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  // Solo el eje Y. Ignorar `transform.x` deja el bloqueo de eje gratis, sin `@dnd-kit/modifiers`.
  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    position: 'relative',
    // Mientras se arrastra, la fila viaja por encima de sus vecinas en vez de colarse bajo ellas.
    zIndex: isDragging ? 1 : undefined,
  }

  // Se entrega también con la lista deshabilitada: dnd-kit deja los listeners inertes, y así la
  // fila puede seguir pintando el asa atenuada en vez de hacerla desaparecer a mitad de mutación.
  const dragHandleProps = {
    ...attributes,
    ...listeners,
    ref: setActivatorNodeRef,
    // Sin esto el navegador se queda el gesto para hacer scroll y el arrastre no llega a empezar.
    style: { touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' },
  }

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(item, { dragHandleProps, isDragging, index })}
    </div>
  )
}

function SortableList({ items = [], renderItem, onReorder, disabled = false }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Un toque corto sobre el asa sigue siendo un toque: el arrastre pide recorrido.
      activationConstraint: { distance: design.gestureActivationDistance },
    })
  )

  const ids = useMemo(() => items.map(item => item.id), [items])

  // dnd-kit expresa el umbral de auto-scroll como RATIO del viewport, no en px; el token es una
  // distancia, así que se convierte aquí. Se acota a 0.5 para que en una ventana muy baja las dos
  // zonas no se coman la pantalla entera.
  const autoScroll = useMemo(() => ({
    threshold: {
      x: 0,
      y: Math.min(0.5, design.dragAutoScrollEdge / (window.innerHeight || design.dragAutoScrollEdge)),
    },
  }), [])

  // Los anuncios por defecto de dnd-kit son cadenas en inglés fuera de i18n. Como el arrastre no
  // es el camino accesible (lo es la lista de posiciones del menú), se silencian en vez de
  // traducirse, que obligaría a mantener copy para una ruta que un lector de pantalla no usa.
  const accessibility = useMemo(() => ({
    announcements: {
      onDragStart: () => undefined,
      onDragMove: () => undefined,
      onDragOver: () => undefined,
      onDragEnd: () => undefined,
      onDragCancel: () => undefined,
    },
    screenReaderInstructions: { draggable: '' },
  }), [])

  const handleDragEnd = ({ active, over }) => {
    if (!over) return
    const fromIndex = ids.indexOf(active.id)
    const toIndex = ids.indexOf(over.id)
    if (fromIndex === -1 || toIndex === -1) return
    onReorder(fromIndex, toIndex)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={autoScroll}
      accessibility={accessibility}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableRow
            key={item.id}
            id={item.id}
            item={item}
            index={index}
            disabled={disabled}
            renderItem={renderItem}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}

export default SortableList
