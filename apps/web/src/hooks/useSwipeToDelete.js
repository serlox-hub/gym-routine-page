import { useRef } from 'react'
import { shouldClaimSwipe, clampSwipeOffset } from '@gym/shared'
import { design } from '../lib/styles.js'

// ============================================
// SWIPE PARA BORRAR
// ============================================

/**
 * Gesto de swipe-a-la-izquierda para borrar una fila. Las reglas (cuándo es swipe, cuánto se
 * mueve) viven en `lib/swipeGesture.js`; esto es la parte de plataforma: seguir el puntero y
 * pintar por frame.
 *
 * La zona que escucha (`handlers`) y lo que se mueve (`rowRef`) pueden ser elementos distintos:
 * en un día de rutina se escucha solo la cabecera (el cuerpo tiene los swipes de sus ejercicios)
 * pero se desliza la tarjeta entera.
 *
 * La fila nunca se queda abierta: al soltar vuelve a su sitio y, si cruzó el umbral, llama a
 * `onDelete`, que debe pedir confirmación (es la única guarda del borrado).
 *
 * @param {{ onDelete: function }} options
 * @returns {{ rowRef, affordanceRef, handlers: object, consumeClick: function, blockedRef }}
 *   `consumeClick()` devuelve true si el click que llega tras el pointerup es el resto de un
 *   swipe y hay que ignorarlo.
 */
export function useSwipeToDelete({ onDelete }) {
  // Estado del gesto en refs porque se escribe en cada pointermove, y pintar la fila por frame
  // desde el estado de React remontaría la tarjeta entera en cada uno.
  const rowRef = useRef(null)
  const affordanceRef = useRef(null)
  const gesture = useRef({ pointerId: null, startX: 0, startY: 0, phase: 'idle', offset: 0 })
  // El click llega DESPUÉS del pointerup: sin esta bandera, un swipe abandonado antes del umbral
  // volvería a su sitio y además dispararía la pulsación de la fila.
  const suppressClick = useRef(false)
  // Lo escribe el asa de arrastre de la fila (`DragHandle`, `onPressStart`/`onPressEnd`): mientras
  // el dedo esté sobre ella el swipe no reclama el gesto. Se pone al TOCAR el asa, no al activarse
  // el arrastre, porque la clasificación del swipe ocurre antes (issues #78, #88).
  const blockedRef = useRef(false)

  const paintRow = (offset, animated) => {
    const row = rowRef.current
    if (!row) return
    row.style.transition = animated ? `transform ${design.slideAnimDuration}ms ease-out` : 'none'
    // En reposo se QUITA el transform, no se deja en translateX(0): cualquier transform convierte
    // la fila en el contenedor de sus descendientes `position: fixed`, y el menú de un día (un
    // `Modal` sin portal dentro de la tarjeta) quedaría encerrado en ella tras el primer swipe.
    row.style.transform = offset === 0 ? '' : `translateX(${offset}px)`
    // La afordancia se descubre interpolando su opacidad con el propio recorrido, igual que
    // native: dejarla en rojo sólido aquí haría que el mismo gesto se viera distinto en cada app.
    const affordance = affordanceRef.current
    if (!affordance) return
    affordance.style.transition = animated ? `opacity ${design.slideAnimDuration}ms ease-out` : 'none'
    affordance.style.opacity = String(Math.min(1, Math.abs(offset) / design.swipeDeleteMaxTravel))
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Un gesto por vez: un segundo dedo sobre la fila NO reclasifica el que ya está en vuelo.
    // Sin esta guarda, apoyar el pulgar a mitad de swipe devolvía `phase` a 'undecided' y la
    // fila se quedaba encallada abierta al soltar, con la captura sin liberar.
    if (gesture.current.phase !== 'idle') return
    suppressClick.current = false
    gesture.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, phase: 'undecided', offset: 0 }
  }

  const onPointerMove = (e) => {
    const g = gesture.current
    if (g.phase === 'idle' || g.phase === 'yield') return
    if (e.pointerId !== g.pointerId) return

    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY

    if (g.phase === 'undecided') {
      // Nada se reclama al tocar: el primer movimiento que pasa de la distancia de activación
      // en CUALQUIER eje clasifica el gesto una sola vez. Lo que no es swipe cede el resto del
      // gesto, y así la lista sigue scrolleando en vertical.
      if (Math.abs(dx) < design.gestureActivationDistance && Math.abs(dy) < design.gestureActivationDistance) return
      const claimed = shouldClaimSwipe(dx, dy, {
        activationDistance: design.gestureActivationDistance,
        blocked: blockedRef.current,
      })
      g.phase = claimed ? 'swipe' : 'yield'
      if (!claimed) return
      // La captura mantiene los moves llegando aunque el dedo se salga de la fila. Por eso NO
      // se cablea `pointerleave` (a diferencia de StreakCard): con captura no se alcanza.
      e.currentTarget.setPointerCapture?.(e.pointerId)
      suppressClick.current = true
    }

    g.offset = clampSwipeOffset(dx, design.swipeDeleteMaxTravel)
    paintRow(g.offset, false)
  }

  const endGesture = (e, commit) => {
    const g = gesture.current
    if (g.phase === 'idle' || e.pointerId !== g.pointerId) return
    const wasSwipe = g.phase === 'swipe'
    const offset = g.offset
    gesture.current = { pointerId: null, startX: 0, startY: 0, phase: 'idle', offset: 0 }

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (offset !== 0) paintRow(0, true)
    if (wasSwipe && commit && offset <= -design.swipeDeleteThreshold) onDelete?.()
  }

  const consumeClick = () => {
    if (!suppressClick.current) return false
    suppressClick.current = false
    return true
  }

  return {
    rowRef,
    affordanceRef,
    blockedRef,
    consumeClick,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e) => endGesture(e, true),
      onPointerCancel: (e) => endGesture(e, false),
    },
  }
}
