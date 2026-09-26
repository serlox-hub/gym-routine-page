// Aritmética del arrastre-para-reordenar de una lista vertical: dónde cae el elemento que se
// arrastra, cuánto se aparta cada vecino para abrir el hueco, y a qué velocidad hay que
// auto-scrollear al acercarse a un borde. Son cálculo puro con varias ramas, así que viven aquí
// y no en el componente: se testean sin React ni dispositivo.
//
// En web nada de esto se usa: `@dnd-kit` ya resuelve colisión, desplazamiento y auto-scroll. Lo
// consume la lista de native, que lo hace a mano sobre Reanimated.
//
// ⚠️ Las tres llevan la directiva `'worklet'` porque native las invoca desde el HILO DE UI (el
// `onUpdate` del pan, los `useAnimatedStyle` de cada fila y el frame callback del auto-scroll);
// llamar desde ahí a una función no workletizada revienta en runtime. El plugin que la procesa
// lo configura `babel-preset-expo`, y Metro aplica ese Babel también a `packages/shared`. En web
// y en los tests la directiva es una cadena inerte al principio del cuerpo: no cambia nada.
// Sin imports a propósito: un worklet no puede capturar módulos que no estén workletizados.

/**
 * Índice en el que caería el elemento arrastrado, dado cuánto se ha movido en vertical.
 *
 * Es el del elemento cuyo centro (en la disposición de antes del arrastre) queda más cerca del
 * centro del arrastrado: la misma regla que `closestCenter` de `@dnd-kit` en web, para que un
 * gesto caiga igual en las dos apps. Con "cruzar la mitad del vecino", una fila fina (el pie de
 * una superserie, ~9px) se cruzaba con 5px de temblor; así hace falta la mitad de la suma de los
 * dos semialtos. En un empate se queda donde está, y entre dos vecinos gana el de arriba.
 *
 * @param {number} fromIndex - Índice de partida del elemento arrastrado
 * @param {number} offsetY - Desplazamiento vertical acumulado (positivo = hacia abajo)
 * @param {number[]} itemHeights - Alto de cada elemento, indexado igual que la lista
 * @returns {number} Índice destino (igual a `fromIndex` si el arrastre no ha cruzado a nadie)
 */
export function getDropIndex(fromIndex, offsetY, itemHeights) {
  'worklet'
  if (!itemHeights || itemHeights.length === 0) return fromIndex
  if (fromIndex < 0 || fromIndex > itemHeights.length - 1) return fromIndex

  const centers = []
  let top = 0
  for (let i = 0; i < itemHeights.length; i++) {
    const height = itemHeights[i] || 0
    centers.push(top + height / 2)
    top += height
  }

  const dragged = centers[fromIndex] + offsetY
  let target = fromIndex
  let best = Math.abs(dragged - centers[fromIndex])
  for (let i = 0; i < centers.length; i++) {
    const distance = Math.abs(dragged - centers[i])
    if (distance < best) {
      target = i
      best = distance
    }
  }
  return target
}

/**
 * Distancia desde el principio de la lista hasta el hueco que abre el arrastrado en `toIndex`: la
 * suma de los altos de los elementos que quedan por encima una vez colocado. Es donde se pinta lo
 * que ocupa el hueco mientras la tarjeta viaja con el dedo.
 *
 * @param {number} fromIndex - Índice de partida del arrastrado
 * @param {number} toIndex - Índice destino actual del arrastrado
 * @param {number[]} itemHeights - Alto de cada elemento
 * @returns {number} Desplazamiento en px desde arriba de la lista
 */
export function getDropSlotOffset(fromIndex, toIndex, itemHeights) {
  'worklet'
  if (!itemHeights || toIndex < 0) return 0
  let offset = 0
  let above = 0
  for (let i = 0; i < itemHeights.length && above < toIndex; i++) {
    if (i === fromIndex) continue
    offset += itemHeights[i] || 0
    above++
  }
  return offset
}

/**
 * Cuánto se aparta el elemento `index` para abrir el hueco del arrastrado.
 *
 * Solo se mueven los que quedan ENTRE el origen y el destino, y lo hacen exactamente el alto del
 * arrastrado: así el hueco que abren mide lo que el elemento que va a caer en él.
 *
 * @param {number} index - Índice del elemento que se está pintando
 * @param {number} fromIndex - Índice de partida del arrastrado
 * @param {number} toIndex - Índice destino actual del arrastrado
 * @param {number[]} itemHeights - Alto de cada elemento
 * @returns {number} Desplazamiento en px (negativo = hacia arriba)
 */
export function getDragShift(index, fromIndex, toIndex, itemHeights) {
  'worklet'
  if (fromIndex === toIndex || index === fromIndex) return 0
  // Sin alto medido no hay hueco que abrir. El corte temprano evita además devolver `-0`.
  const draggedHeight = (itemHeights && itemHeights[fromIndex]) || 0
  if (!draggedHeight) return 0
  if (toIndex > fromIndex && index > fromIndex && index <= toIndex) return -draggedHeight
  if (toIndex < fromIndex && index >= toIndex && index < fromIndex) return draggedHeight
  return 0
}

/**
 * Velocidad de auto-scroll cuando el dedo se acerca a un borde del viewport.
 *
 * Crece linealmente desde 0 en el límite de la zona hasta `maxSpeed` en el borde mismo, para que
 * asomarse un poco arrastre despacio y pegarse al borde arrastre rápido. Si el viewport es tan
 * bajo que las dos zonas se solapan, manda la de arriba.
 *
 * @param {number} pointerY - Y del dedo dentro del viewport
 * @param {number} viewportHeight - Alto visible del contenedor con scroll
 * @param {number} edge - Distancia desde el borde a la que empieza el auto-scroll
 * @param {number} maxSpeed - Velocidad en el borde (px por frame)
 * @returns {number} Velocidad con signo (negativa = hacia arriba), 0 fuera de las zonas
 */
export function getAutoScrollSpeed(pointerY, viewportHeight, edge, maxSpeed) {
  'worklet'
  if (!(edge > 0) || !(maxSpeed > 0) || !(viewportHeight > 0)) return 0

  if (pointerY < edge) {
    const intensity = Math.min(1, (edge - pointerY) / edge)
    return -maxSpeed * intensity
  }
  const bottomEdgeStart = viewportHeight - edge
  if (pointerY > bottomEdgeStart) {
    const intensity = Math.min(1, (pointerY - bottomEdgeStart) / edge)
    return maxSpeed * intensity
  }
  return 0
}
