import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  useScrollViewOffset,
  useFrameCallback,
  measure,
  scrollTo,
  runOnJS,
  withTiming,
} from 'react-native-reanimated'
import { getDropIndex, getDragShift, getAutoScrollSpeed, getHaptics } from '@gym/shared'
import { design } from '../../lib/styles'

// Lista vertical reordenable por arrastre. El arrastre SIEMPRE empieza en un asa: quien pinta
// cada fila recibe `dragHandleProps` y lo pasa al `DragHandle` que envuelve el asa, y el resto de
// la fila conserva sus pulsaciones y el scroll de la pantalla. Es también lo que mantiene a los
// llamantes sin importar nada de `react-native-gesture-handler`.
//
// El camino accesible sigue siendo la lista de posiciones del menú de cada fila, no esto.
//
// Dos props opcionales cubren las listas cuyas filas no son todas intercambiables (los ejercicios
// de un día: una superserie viaja entera y un ejercicio puede entrar o salir de una). Las dos son
// funciones PURAS y WORKLETIZADAS de `@gym/shared` (aquí no vive ninguna regla), porque se llaman
// desde el hilo de UI: `collapseForDrag(items, activeId)` da la lista que se pinta mientras se
// arrastra (una superserie pliega sus miembros para que viaje solo su cabecera) y
// `resolveDrop(items, activeId, index)` valida el índice destino, para que la vista previa abra el
// hueco donde de verdad se va a caer y no uno imposible.
//
// A third optional prop, `getDragPreview(items, activeId, index, offsetX)`, returns how the dragged
// row should look if dropped at the vetted position, as a primitive value (a row about to join a
// superset is painted as a member of it). It is a worklet too. The list mirrors it to React only
// when it changes and hands it to `renderItem` as `dragPreview` (null on every other row); what it
// looks like is the caller's.
//
// `onReorder(fromIndex, toIndex, activeId, offsetX)` is also called with `toIndex === fromIndex`:
// shifting the row horizontally without moving it can change its membership. Callers that only
// reorder discard that case.
//
// ⚠️ `scrollRef` tiene que ser un `useAnimatedRef` apuntando a un `Animated.ScrollView`: el
// auto-scroll lo conduce `scrollTo` desde el hilo de UI, y sobre un `ScrollView` normal no hace
// nada NI AVISA (el arrastre simplemente nunca scrollea). Dos listas anidadas pueden compartir el
// mismo `scrollRef`: cada `useScrollViewOffset` registra su propio handler para el mismo tag y el
// registro de eventos de Reanimated los invoca TODOS (`EventHandlerRegistry::processEvent` recorre
// el mapa de handlers de ese par tag+evento), así que la lista de días y la de ejercicios de dentro
// reciben las dos el offset.

// px por frame en el borde mismo (≈720 px/s a 60fps). Deliberadamente NO compartido con web: ver
// el comentario de `dragAutoScrollEdge` en `lib/styles.js`.
const AUTO_SCROLL_MAX_SPEED = 12

function DraggableRow({ index, item, renderItem, state, gesture, isDragging, dragPreview }) {
  const { activeIndex, targetIndex, dragY, heights, onMeasure } = state

  // El desplazamiento del vecino vive en su propia shared value en vez de calcularse dentro del
  // `useAnimatedStyle`: allí `dragY` estaría en el closure y el worklet correría cada frame,
  // reiniciando el `withTiming` sin dejarlo llegar nunca a su destino.
  const shift = useSharedValue(0)
  useAnimatedReaction(
    () => (activeIndex.value < 0 ? 0 : getDragShift(index, activeIndex.value, targetIndex.value, heights.value)),
    (next, previous) => {
      // Al soltar se SALTA a 0, no se anima: la reordenación de verdad llega unos frames más
      // tarde (`onMutate` empieza por un `await cancelQueries`), así que animar la vuelta al
      // reposo desliza al vecino hacia donde YA va a estar y se ve saltar cuando aterriza el
      // re-render. Durante el arrastre sí se anima: ahí el hueco se abre en vivo.
      if (activeIndex.value < 0) shift.value = 0
      else if (next !== previous) shift.value = withTiming(next, { duration: design.slideAnimDuration })
    }
  )

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index
    return {
      transform: [{ translateY: isActive ? dragY.value : shift.value }],
      // La tarjeta arrastrada viaja por encima de sus vecinas en vez de colarse bajo ellas
      // (`elevation` es lo que ordena en Android, `zIndex` en iOS).
      zIndex: isActive ? 2 : 0,
      elevation: isActive ? 2 : 0,
    }
  })

  const handleLayout = useCallback(
    (event) => onMeasure(item.id, event.nativeEvent.layout.height),
    [onMeasure, item.id]
  )

  const dragHandleProps = useMemo(() => ({ gesture: gesture(index, item.id) }), [gesture, index, item.id])

  return (
    <Animated.View onLayout={handleLayout} style={animatedStyle}>
      {renderItem(item, { dragHandleProps, isDragging, index, dragPreview })}
    </Animated.View>
  )
}

export default function DraggableList({ items = [], renderItem, onReorder, disabled = false, scrollRef, collapseForDrag, resolveDrop, getDragPreview }) {
  const activeIndex = useSharedValue(-1)
  const targetIndex = useSharedValue(-1)
  const panY = useSharedValue(0)
  const panX = useSharedValue(0)
  const preview = useSharedValue(null)
  const pointerY = useSharedValue(0)
  // px que el auto-scroll ha movido el contenido bajo el dedo durante este arrastre: sin sumarlos
  // la tarjeta se quedaría atrás en cuanto la lista empieza a correr sola.
  const scrollComp = useSharedValue(0)
  // Alto medido de cada fila POR ID, no por índice: con el plegado la misma fila cambia de índice a
  // mitad de gesto, y una tabla por índice se desalinearía sin que nada lo notase.
  const heightsById = useSharedValue({})
  // Altos de la lista EN VUELO, por índice de la lista (ya plegada) que se arrastra. Se congela al
  // levantar: mientras el dedo viaja no entra ni sale ninguna fila.
  const heights = useSharedValue([])
  // Copia de las filas y de la que se arrastra en el hilo de UI: `collapseForDrag` y `resolveDrop`
  // se llaman desde los worklets del gesto, donde no se puede leer una prop de React.
  const rowsSource = useSharedValue([])
  const draggedRows = useSharedValue([])
  const draggedRowId = useSharedValue(null)
  const dragY = useDerivedValue(() => panY.value + scrollComp.value)
  // Espejo en el hilo de JS de la fila en vuelo, para que pueda pintarse distinta mientras se
  // arrastra y para plegar la lista. Cambia dos veces por arrastre, no por frame.
  const [draggingId, setDraggingId] = useState(null)
  // Same for `preview`: it changes when the landing slot changes how the row looks, not per frame.
  const [dragPreview, setDragPreview] = useState(null)

  // Copia superficial a propósito: Reanimated congela en desarrollo los objetos que viajan a una
  // shared value, y los de `items` pueden venir de la caché de query (los días), que no puede
  // quedarse congelada.
  useEffect(() => {
    rowsSource.value = items.map(item => ({ ...item }))
  }, [items, rowsSource])

  // Mientras se arrastra una superserie, sus miembros no se pintan: la cabecera viaja sola y los
  // vecinos se apartan el alto de la cabecera, no el de la tarjeta entera.
  const rows = useMemo(
    () => (draggingId != null && collapseForDrag ? collapseForDrag(items, draggingId) : items),
    [items, draggingId, collapseForDrag]
  )

  const canAutoScroll = !!scrollRef
  const scrollOffset = useScrollViewOffset(scrollRef ?? null)
  // Rect del contenedor con scroll en coordenadas de PANTALLA, medido al levantar la tarjeta.
  // `pointerY` es `absoluteY`, o sea pantalla, y la lista no empieza en y=0: encima van el safe
  // area y la cabecera de la pantalla. Comparar contra el alto de la ventana dejaba la banda de
  // auto-scroll de arriba tapada por esa cabecera, así que se podía arrastrar un día hasta el
  // final de la lista pero no de vuelta al principio.
  const viewportTop = useSharedValue(0)
  const viewportHeight = useSharedValue(0)

  const onMeasure = useCallback((id, height) => {
    if (heightsById.value[id] === height) return
    heightsById.value = { ...heightsById.value, [id]: height }
  }, [heightsById])

  // The preview (gap and look) comes from the same index and offset handed over on drop, so what
  // is saved is what was seen.
  useAnimatedReaction(
    () => ({ y: dragY.value, x: panX.value }),
    ({ y, x }) => {
      if (activeIndex.value < 0) return
      const raw = getDropIndex(activeIndex.value, y, heights.value)
      const target = resolveDrop ? resolveDrop(draggedRows.value, draggedRowId.value, raw) : raw
      targetIndex.value = target
      if (!getDragPreview) return
      const next = getDragPreview(draggedRows.value, draggedRowId.value, target, x)
      if (next !== preview.value) preview.value = next
    }
  )

  useAnimatedReaction(
    () => preview.value,
    (next, previous) => {
      if (next !== previous) runOnJS(setDragPreview)(next)
    }
  )

  // El desplazamiento REAL del ScrollView es la fuente de `scrollComp`, no la velocidad pedida:
  // al llegar al final del contenido el offset deja de moverse y la compensación se detiene sola,
  // sin necesidad de conocer el alto del contenido.
  useAnimatedReaction(
    () => scrollOffset.value,
    (current, previous) => {
      if (activeIndex.value < 0 || previous === null) return
      scrollComp.value += current - previous
    }
  )

  const autoScroll = useFrameCallback(() => {
    if (!canAutoScroll || activeIndex.value < 0) return
    const speed = getAutoScrollSpeed(pointerY.value - viewportTop.value, viewportHeight.value, design.dragAutoScrollEdge, AUTO_SCROLL_MAX_SPEED)
    if (speed === 0) return
    scrollTo(scrollRef, 0, Math.max(0, scrollOffset.value + speed), false)
  }, false)

  const handleLift = useCallback((id) => {
    getHaptics()?.onDragLift?.()
    setDraggingId(id)
    autoScroll.setActive(true)
  }, [autoScroll])

  const handleRelease = useCallback(() => {
    setDraggingId(null)
    autoScroll.setActive(false)
  }, [autoScroll])

  const gestureFor = useCallback((index, id) => {
    const pan = Gesture.Pan()
      // Se crea también con la lista deshabilitada, solo que inerte: así la fila puede seguir
      // pintando el asa atenuada en vez de hacerla desaparecer a mitad de mutación.
      .enabled(!disabled)
      // El asa no hace nada más que arrastrar, así que reclama el gesto desde el propio toque:
      // sin esto el primer tramo del movimiento se lo lleva el scroll de la pantalla.
      .minDistance(0)
      .onStart(() => {
        if (scrollRef) {
          const rect = measure(scrollRef)
          // Sin medida se queda en 0 y `getAutoScrollSpeed` devuelve 0: mejor sin auto-scroll que
          // scrolleando contra un viewport inventado.
          viewportTop.value = rect ? rect.pageY : 0
          viewportHeight.value = rect ? rect.height : 0
        }

        // La lista en vuelo se calcula aquí, en el hilo de UI, con la MISMA función pura con la que
        // el render la pliega unos frames después: así los altos y el índice activo no dependen de
        // que el re-render haya aterrizado ya.
        const inFlight = collapseForDrag ? collapseForDrag(rowsSource.value, id) : rowsSource.value
        const inFlightHeights = []
        let activeInFlight = index
        for (let i = 0; i < inFlight.length; i++) {
          inFlightHeights.push(heightsById.value[inFlight[i].id] || 0)
          if (inFlight[i].id === id) activeInFlight = i
        }
        heights.value = inFlightHeights
        draggedRows.value = inFlight
        draggedRowId.value = id

        activeIndex.value = activeInFlight
        targetIndex.value = activeInFlight
        panY.value = 0
        panX.value = 0
        preview.value = null
        scrollComp.value = 0
        runOnJS(handleLift)(id)
      })
      .onUpdate((event) => {
        panY.value = event.translationY
        panX.value = event.translationX
        pointerY.value = event.absoluteY
      })
      .onEnd(() => {
        runOnJS(onReorder)(activeIndex.value, targetIndex.value, id, panX.value)
      })
      .onFinalize(() => {
        activeIndex.value = -1
        targetIndex.value = -1
        panY.value = 0
        panX.value = 0
        preview.value = null
        scrollComp.value = 0
        draggedRowId.value = null
        runOnJS(handleRelease)()
      })
    // Relación declarada con el contenedor con scroll en vez de confiar en el arbitraje por
    // defecto, que es quien decide a cuál de los dos se le concede el dedo.
    return scrollRef ? pan.blocksExternalGesture(scrollRef) : pan
  }, [disabled, scrollRef, collapseForDrag, rowsSource, draggedRows, draggedRowId, heights, heightsById, activeIndex, targetIndex, panY, panX, preview, pointerY, scrollComp, viewportTop, viewportHeight, handleLift, handleRelease, onReorder])

  const state = useMemo(
    () => ({ activeIndex, targetIndex, dragY, heights, onMeasure }),
    [activeIndex, targetIndex, dragY, heights, onMeasure]
  )

  return (
    <View>
      {rows.map((item, index) => (
        <DraggableRow
          key={item.id}
          index={index}
          item={item}
          renderItem={renderItem}
          state={state}
          gesture={gestureFor}
          isDragging={draggingId === item.id}
          dragPreview={draggingId === item.id ? dragPreview : null}
        />
      ))}
    </View>
  )
}
