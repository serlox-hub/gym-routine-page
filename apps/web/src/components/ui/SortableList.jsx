import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, MeasuringStrategy, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { design } from '../../lib/styles.js'

// Lista vertical reordenable por arrastre. El arrastre SIEMPRE empieza en un asa: quien pinta
// cada fila recibe `dragHandleProps` y decide dónde ponerla, y el resto de la fila conserva sus
// pulsaciones y el scroll de la página. Es también lo que mantiene a los llamantes sin importar
// nada de `@dnd-kit`.
//
// El camino accesible sigue siendo la lista de posiciones del menú de cada fila, no esto.
//
// Tres props opcionales cubren las listas cuyas filas no son todas intercambiables (los ejercicios
// de un día: una superserie viaja entera y un ejercicio puede entrar o salir de una). Son funciones
// PURAS de `@gym/shared`; aquí no vive ninguna regla:
// - `collapseForDrag(items, activeId)`: la lista que se pinta mientras se arrastra (una superserie
//   pliega sus miembros para que viaje solo su cabecera).
// - `resolveDrop(items, activeId, index)`: la posición final válida más cercana. Se usa para DOS
//   cosas: dejar fuera de la detección de colisión las filas cuya posición no es válida, para que
//   la vista previa abra el hueco donde de verdad se va a caer y no uno imposible, y validar el
//   índice con el que se suelta.
// - `getDragPreview(items, activeId, index)`: how the dragged row should look if dropped at the
//   vetted position, as a primitive value (a row about to join a superset is painted as a member of
//   it). The list only computes it and hands it to `renderItem` as `dragPreview` (null on every
//   other row); what it looks like is the caller's.
//
// `withDropSlot` splits the dragged row in two: a floating copy follows the pointer (`renderItem`
// with `isDragging`), and the row itself stays in the list, in the gap it would drop into, drawn by
// `renderItem` with `isDropSlot` (and `dragPreview`) at the height it had. That is what lets a
// superset card keep its purple sides continuous around the gap: the floating copy can never line
// up with them. Same prop and flags as native `DraggableList`.
//
// `animateShift={false}` makes the rows jump to their new place instead of sliding. A list whose
// rows draw one card between them needs it: rows slide at different moments (only the one the
// pointer crosses moves), so mid-slide the card has holes where no row is yet.

// dnd-kit no renderiza contenedor propio: las filas quedan como hijas directas del layout que
// envuelve a la lista, así que el `gap` del padre sigue separándolas.
function SortableRow({ id, index, disabled, renderItem, item, dragPreview = null, withDropSlot = false, animateShift = true }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    node,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled, transition: animateShift ? undefined : null })

  // Height at rest, for the drop slot. Measured here and not taken from the drag start event:
  // dnd-kit has not measured the row yet when `onDragStart` fires.
  const restingHeight = useRef(null)
  useLayoutEffect(() => {
    if (!isDragging && node.current) restingHeight.current = node.current.offsetHeight
  })

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

  // As a drop slot the row keeps its height but not its content, so nothing below it moves.
  if (isDragging && withDropSlot && restingHeight.current != null) {
    return (
      <div ref={setNodeRef} style={{ ...style, height: restingHeight.current }}>
        {renderItem(item, { dragHandleProps, isDragging: false, index, dragPreview, isDropSlot: true })}
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(item, { dragHandleProps, isDragging, index, dragPreview, isDropSlot: false })}
    </div>
  )
}

// What the floating copy gets instead of the real handle: it only has to look grabbed.
const OVERLAY_HANDLE_PROPS = { style: { touchAction: 'none', cursor: 'grabbing' } }

function SortableList({ items = [], renderItem, onReorder, disabled = false, collapseForDrag, resolveDrop, getDragPreview, withDropSlot = false, animateShift = true }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Un toque corto sobre el asa sigue siendo un toque: el arrastre pide recorrido.
      activationConstraint: { distance: design.gestureActivationDistance },
    })
  )

  const [activeId, setActiveId] = useState(null)
  // Preview of the dragged row, recomputed only when `over` changes.
  const [dragPreview, setDragPreview] = useState(null)

  // La lista plegada es la que se pinta Y la que cuenta los índices: quien recibe `onReorder` la
  // reconstruye con la misma función pura, así que los dos lados hablan de las mismas posiciones.
  const rows = useMemo(
    () => (activeId != null && collapseForDrag ? collapseForDrag(items, activeId) : items),
    [items, activeId, collapseForDrag]
  )
  const ids = useMemo(() => rows.map(row => row.id), [rows])
  const activeIndex = activeId == null ? -1 : ids.indexOf(activeId)

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

  // Vetted final position of the current `over`, or -1. Preview and drop both compute it here, the
  // same way, so what is saved is what was seen.
  const getTargetIndex = (active, over) => {
    if (!over) return -1
    const rawIndex = ids.indexOf(over.id)
    if (rawIndex === -1) return -1
    return resolveDrop ? resolveDrop(rows, active.id, rawIndex) : rawIndex
  }

  const updateDragPreview = ({ active, over }) => {
    if (!getDragPreview) return
    const toIndex = getTargetIndex(active, over)
    setDragPreview(toIndex === -1 ? null : getDragPreview(rows, active.id, toIndex))
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    setDragPreview(null)
    const fromIndex = ids.indexOf(active.id)
    const toIndex = getTargetIndex(active, over)
    if (fromIndex === -1 || toIndex === -1 || toIndex === fromIndex) return
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
      onDragOver={updateDragPreview}
      onDragCancel={() => {
        setActiveId(null)
        setDragPreview(null)
      }}
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
            dragPreview={item.id === activeId ? dragPreview : null}
            withDropSlot={withDropSlot}
            animateShift={animateShift}
          />
        ))}
      </SortableContext>
      {withDropSlot && (
        // No drop animation: the list reorders as soon as it is dropped, and animating the copy
        // towards the slot would land it where the row no longer is.
        <DragOverlay dropAnimation={null}>
          {activeIndex === -1 ? null : renderItem(rows[activeIndex], {
            dragHandleProps: OVERLAY_HANDLE_PROPS,
            isDragging: true,
            index: activeIndex,
            dragPreview: null,
            isDropSlot: false,
          })}
        </DragOverlay>
      )}
    </DndContext>
  )
}

export default SortableList
