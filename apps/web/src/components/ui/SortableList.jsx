import { useCallback, useMemo, useState } from 'react'
import { DndContext, MeasuringStrategy, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { design } from '../../lib/styles.js'

// Lista vertical reordenable por arrastre. El arrastre SIEMPRE empieza en un asa: quien pinta
// cada fila recibe `dragHandleProps` y decide dónde ponerla, y el resto de la fila conserva sus
// pulsaciones y el scroll de la página. Es también lo que mantiene a los llamantes sin importar
// nada de `@dnd-kit`.
//
// El camino accesible sigue siendo la lista de posiciones del menú de cada fila, no esto.
//
// Dos props opcionales cubren las listas cuyas filas no son todas intercambiables (los ejercicios
// de un día: una superserie viaja entera y un miembro no sale de la suya). Las dos son funciones
// PURAS de `@gym/shared`; aquí no vive ninguna regla:
// - `collapseForDrag(items, activeId)`: la lista que se pinta mientras se arrastra (una superserie
//   pliega sus miembros para que viaje solo su cabecera).
// - `resolveDrop(items, activeId, index)`: la posición final válida más cercana. Se usa para DOS
//   cosas: dejar fuera de la detección de colisión las filas cuya posición no es válida, para que
//   la vista previa abra el hueco donde de verdad se va a caer y no uno imposible, y validar el
//   índice con el que se suelta.

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

function SortableList({ items = [], renderItem, onReorder, disabled = false, collapseForDrag, resolveDrop }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Un toque corto sobre el asa sigue siendo un toque: el arrastre pide recorrido.
      activationConstraint: { distance: design.gestureActivationDistance },
    })
  )

  const [activeId, setActiveId] = useState(null)

  // La lista plegada es la que se pinta Y la que cuenta los índices: quien recibe `onReorder` la
  // reconstruye con la misma función pura, así que los dos lados hablan de las mismas posiciones.
  const rows = useMemo(
    () => (activeId != null && collapseForDrag ? collapseForDrag(items, activeId) : items),
    [items, activeId, collapseForDrag]
  )
  const ids = useMemo(() => rows.map(row => row.id), [rows])

  // dnd-kit expresa el umbral de auto-scroll como RATIO del viewport, no en px; el token es una
  // distancia, así que se convierte aquí. Se acota a 0.5 para que en una ventana muy baja las dos
  // zonas no se coman la pantalla entera.
  const autoScroll = useMemo(() => ({
    threshold: {
      x: 0,
      y: Math.min(0.5, design.dragAutoScrollEdge / (window.innerHeight || design.dragAutoScrollEdge)),
    },
  }), [])

  // Al plegar cambian los rects de todas las filas: sin remedir, dnd-kit seguiría colocando el
  // hueco con las medidas de antes del arrastre.
  const measuring = useMemo(
    () => (collapseForDrag ? { droppable: { strategy: MeasuringStrategy.Always } } : undefined),
    [collapseForDrag]
  )

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

  const collisionDetection = useCallback((args) => {
    if (!resolveDrop || !args.active) return closestCenter(args)
    const validContainers = args.droppableContainers.filter(container => {
      const index = ids.indexOf(container.id)
      return index !== -1 && resolveDrop(rows, args.active.id, index) === index
    })
    // Sin ninguna fila válida se deja la detección normal: la validación del índice al soltar es
    // la que manda, y quedarse sin `over` cancelaría el arrastre en vez de no mover nada.
    return closestCenter({ ...args, droppableContainers: validContainers.length > 0 ? validContainers : args.droppableContainers })
  }, [resolveDrop, rows, ids])

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const fromIndex = ids.indexOf(active.id)
    const rawIndex = ids.indexOf(over.id)
    if (fromIndex === -1 || rawIndex === -1) return
    const toIndex = resolveDrop ? resolveDrop(rows, active.id, rawIndex) : rawIndex
    if (toIndex === fromIndex) return
    onReorder(fromIndex, toIndex, active.id)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      autoScroll={autoScroll}
      accessibility={accessibility}
      measuring={measuring}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {rows.map((item, index) => (
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
