import { useCallback, useMemo, useState } from 'react'
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
// ⚠️ `scrollRef` tiene que ser un `useAnimatedRef` apuntando a un `Animated.ScrollView`: el
// auto-scroll lo conduce `scrollTo` desde el hilo de UI, y sobre un `ScrollView` normal no hace
// nada NI AVISA (el arrastre simplemente nunca scrollea).

// px por frame en el borde mismo (≈720 px/s a 60fps). Deliberadamente NO compartido con web: ver
// el comentario de `dragAutoScrollEdge` en `lib/styles.js`.
const AUTO_SCROLL_MAX_SPEED = 12

function DraggableRow({ index, item, renderItem, state, gesture, isDragging }) {
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
    (event) => onMeasure(index, event.nativeEvent.layout.height),
    [onMeasure, index]
  )

  const dragHandleProps = useMemo(() => ({ gesture: gesture(index) }), [gesture, index])

  return (
    <Animated.View onLayout={handleLayout} style={animatedStyle}>
      {renderItem(item, { dragHandleProps, isDragging, index })}
    </Animated.View>
  )
}

export default function DraggableList({ items = [], renderItem, onReorder, disabled = false, scrollRef }) {
  const activeIndex = useSharedValue(-1)
  const targetIndex = useSharedValue(-1)
  const panY = useSharedValue(0)
  const pointerY = useSharedValue(0)
  // px que el auto-scroll ha movido el contenido bajo el dedo durante este arrastre: sin sumarlos
  // la tarjeta se quedaría atrás en cuanto la lista empieza a correr sola.
  const scrollComp = useSharedValue(0)
  const heights = useSharedValue([])
  const dragY = useDerivedValue(() => panY.value + scrollComp.value)
  // Espejo en el hilo de JS del índice en vuelo, solo para que la fila pueda pintarse distinta
  // mientras se arrastra. Cambia dos veces por arrastre (al levantar y al soltar), no por frame.
  const [draggingIndex, setDraggingIndex] = useState(-1)

  const canAutoScroll = !!scrollRef
  const scrollOffset = useScrollViewOffset(scrollRef ?? null)
  // Rect del contenedor con scroll en coordenadas de PANTALLA, medido al levantar la tarjeta.
  // `pointerY` es `absoluteY`, o sea pantalla, y la lista no empieza en y=0: encima van el safe
  // area y la cabecera de la pantalla. Comparar contra el alto de la ventana dejaba la banda de
  // auto-scroll de arriba tapada por esa cabecera, así que se podía arrastrar un día hasta el
  // final de la lista pero no de vuelta al principio.
  const viewportTop = useSharedValue(0)
  const viewportHeight = useSharedValue(0)

  const itemCount = items.length
  const onMeasure = useCallback((index, height) => {
    if (heights.value[index] === height && heights.value.length === itemCount) return
    const next = []
    for (let i = 0; i < itemCount; i++) next[i] = i === index ? height : (heights.value[i] || 0)
    heights.value = next
  }, [heights, itemCount])

  useAnimatedReaction(
    () => dragY.value,
    (y) => {
      if (activeIndex.value < 0) return
      targetIndex.value = getDropIndex(activeIndex.value, y, heights.value)
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

  const handleLift = useCallback((index) => {
    getHaptics()?.onDragLift?.()
    setDraggingIndex(index)
    autoScroll.setActive(true)
  }, [autoScroll])

  const handleRelease = useCallback(() => {
    setDraggingIndex(-1)
    autoScroll.setActive(false)
  }, [autoScroll])

  const gestureFor = useCallback((index) => {
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
        activeIndex.value = index
        targetIndex.value = index
        panY.value = 0
        scrollComp.value = 0
        runOnJS(handleLift)(index)
      })
      .onUpdate((event) => {
        panY.value = event.translationY
        pointerY.value = event.absoluteY
      })
      .onEnd(() => {
        runOnJS(onReorder)(index, targetIndex.value)
      })
      .onFinalize(() => {
        activeIndex.value = -1
        targetIndex.value = -1
        panY.value = 0
        scrollComp.value = 0
        runOnJS(handleRelease)()
      })
    // Relación declarada con el contenedor con scroll en vez de confiar en el arbitraje por
    // defecto, que es quien decide a cuál de los dos se le concede el dedo.
    return scrollRef ? pan.blocksExternalGesture(scrollRef) : pan
  }, [disabled, scrollRef, activeIndex, targetIndex, panY, pointerY, scrollComp, viewportTop, viewportHeight, handleLift, handleRelease, onReorder])

  const state = useMemo(
    () => ({ activeIndex, targetIndex, dragY, heights, onMeasure }),
    [activeIndex, targetIndex, dragY, heights, onMeasure]
  )

  return (
    <View>
      {items.map((item, index) => (
        <DraggableRow
          key={item.id}
          index={index}
          item={item}
          renderItem={renderItem}
          state={state}
          gesture={gestureFor}
          isDragging={draggingIndex === index}
        />
      ))}
    </View>
  )
}
