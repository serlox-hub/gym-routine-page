import { useRef } from 'react'
import { Animated, PanResponder } from 'react-native'
import { shouldClaimSwipe, clampSwipeOffset, getHaptics } from '@gym/shared'
import { design } from '../lib/styles'

// ============================================
// SWIPE PARA BORRAR
// ============================================

/**
 * Gesto de swipe-a-la-izquierda para borrar una fila. Las reglas (cuándo es swipe, cuánto se
 * mueve) viven en `lib/swipeGesture.js`; esto es la parte de plataforma: el PanResponder y la
 * animación.
 *
 * La zona que escucha (`panHandlers`) y lo que se mueve (`translateX`) pueden ser vistas
 * distintas: en un día de rutina se escucha solo la cabecera (el cuerpo tiene los swipes de sus
 * ejercicios) pero se desliza la tarjeta entera.
 *
 * La fila nunca se queda abierta: al soltar vuelve a su sitio y, si cruzó el umbral, llama a
 * `onDelete`, que debe pedir confirmación (es la única guarda del borrado).
 *
 * @param {{ onDelete: function }} options
 * @returns {{ panHandlers, translateX, affordanceOpacity, consumePress: function, blockedRef }}
 *   `consumePress()` devuelve true si la pulsación es el resto de un swipe y hay que ignorarla.
 */
export function useSwipeToDelete({ onDelete }) {
  // `onDelete` se lee por ref: el PanResponder se crea una sola vez y sus closures se quedarían
  // con la prop del primer render.
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete
  const translateX = useRef(new Animated.Value(0)).current
  // Clasificación del gesto y si ya cruzó el umbral, por gesto. Ambos se reinician al tocar,
  // que es lo que hace que el háptico suene una vez POR GESTO y no una vez por montaje.
  const gesture = useRef({ phase: 'idle', crossed: false })
  const suppressPress = useRef(false)
  // Seam para el arrastre-para-reordenar (long press + vertical sobre esta misma fila): mientras
  // su pulsación esté pendiente o activa pondrá esto a true y el swipe no reclamará el gesto.
  // Hoy nadie lo escribe. Ver docs/DECISIONS.md (issue #78).
  const blockedRef = useRef(false)

  const panResponder = useRef(
    PanResponder.create({
      // En la fase de captura porque es el único punto del inicio del toque que corre SIEMPRE:
      // el Pressable de dentro reclama el responder en el burbujeo, así que el
      // `onStartShouldSetPanResponder` de este envoltorio podría no llegar a ejecutarse nunca.
      onStartShouldSetPanResponderCapture: () => {
        // Un gesto por vez: un segundo dedo sobre la fila NO reclasifica un swipe en vuelo. Sin
        // esta guarda, apoyar el pulgar a mitad de swipe devolvía `phase` a 'undecided' y el
        // arrastre se soltaba sin borrar. Solo protege 'swipe': un gesto que cedió ('yield')
        // nunca pasa por release/terminate, y si la guarda lo bloqueara la fila no volvería a
        // reclamar ningún swipe hasta remontarse.
        if (gesture.current.phase === 'swipe') return false
        gesture.current = { phase: 'undecided', crossed: false }
        suppressPress.current = false
        return false
      },
      onStartShouldSetPanResponder: () => false,
      // El ScrollView de la pantalla pide el responder en cuanto hay deriva vertical, y sin
      // esto se le concede por defecto: el swipe ya reclamado se soltaría solo a mitad de
      // gesto. Una vez reclamado no se cede (mismo motivo y misma línea que StreakCard).
      onPanResponderTerminationRequest: () => false,
      // Predicado SÍNCRONO: es lo único que separa el swipe del ScrollView que envuelve la
      // pantalla, y tiene que responder antes de que corra ningún handler de movimiento. Por eso
      // la regla de reclamar vive en una función pura compartida y no en un estado compartido,
      // que aquí no se podría consultar.
      onMoveShouldSetPanResponder: (_, g) => {
        const state = gesture.current
        if (state.phase === 'swipe') return true
        if (state.phase !== 'undecided') return false
        if (Math.abs(g.dx) < design.gestureActivationDistance && Math.abs(g.dy) < design.gestureActivationDistance) return false
        const claimed = shouldClaimSwipe(g.dx, g.dy, {
          activationDistance: design.gestureActivationDistance,
          blocked: blockedRef.current,
        })
        state.phase = claimed ? 'swipe' : 'yield'
        if (claimed) suppressPress.current = true
        return claimed
      },
      onPanResponderMove: (_, g) => {
        const offset = clampSwipeOffset(g.dx, design.swipeDeleteMaxTravel)
        translateX.setValue(offset)
        const crossed = offset <= -design.swipeDeleteThreshold
        if (crossed !== gesture.current.crossed) {
          gesture.current.crossed = crossed
          if (crossed) getHaptics()?.onSwipeThresholdCross?.()
        }
      },
      onPanResponderRelease: (_, g) => {
        const shouldDelete = gesture.current.phase === 'swipe'
          && clampSwipeOffset(g.dx, design.swipeDeleteMaxTravel) <= -design.swipeDeleteThreshold
        gesture.current = { phase: 'idle', crossed: false }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }).start()
        if (shouldDelete) onDeleteRef.current?.()
      },
      onPanResponderTerminate: () => {
        gesture.current = { phase: 'idle', crossed: false }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }).start()
      },
    })
  ).current

  // La afordancia se descubre con el propio recorrido en vez de quedarse tapada por la fila:
  // el `active:opacity-70` del Pressable dejaría translucir el rojo en cada pulsación.
  const affordanceOpacity = useRef(translateX.interpolate({
    inputRange: [-design.swipeDeleteMaxTravel, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })).current

  // El responder ya cancela el press cuando el swipe reclama el gesto; esto es el respaldo para
  // Android, donde el onPress puede llegar igualmente tras un gesto reclamado.
  const consumePress = () => {
    if (!suppressPress.current) return false
    suppressPress.current = false
    return true
  }

  return { panHandlers: panResponder.panHandlers, translateX, affordanceOpacity, consumePress, blockedRef }
}
