// Reglas del gesto de una fila deslizable (swipe para borrar). Son las DOS decisiones que no
// pueden divergir entre web y native: si el gesto es un swipe, y cuánto se mueve la fila. El
// resto del gesto (recordar qué salió, pintar por frame) lo implementa cada plataforma, porque
// native tiene que decidir dentro de `onMoveShouldSetPanResponder`, un predicado síncrono que
// no puede consultar estado compartido. Ver docs/DECISIONS.md (issue #78).
// Sin imports a propósito: `packages/shared` no se lintea y el runner de tests es jsdom, así
// que nada mecánico impediría que entrara aquí una referencia al DOM.

/**
 * Decide si un movimiento es un swipe horizontal deliberado.
 *
 * La distancia se mide sobre `dx` solo (nunca sobre la diagonal) y se exige dominancia 2:1
 * sobre `dy`: una deriva de 4px a la derecha y 3px abajo no puede clasificar como swipe, o la
 * lista dejaría de scrollear; un arrastre horizontal deliberado sí clasifica de inmediato.
 *
 * `blocked` entra en la decisión de reclamar, no en una etapa posterior, para que el futuro
 * arrastre-para-reordenar (long press + vertical sobre esta misma fila) pueda impedir el
 * swipe en el único momento en que native puede consultarlo.
 *
 * @param {number} dx - Desplazamiento horizontal acumulado del gesto
 * @param {number} dy - Desplazamiento vertical acumulado del gesto
 * @param {{ activationDistance: number, blocked?: boolean }} options
 * @returns {boolean}
 */
export function shouldClaimSwipe(dx, dy, { activationDistance, blocked = false } = {}) {
  if (blocked) return false
  return Math.abs(dx) >= activationDistance && Math.abs(dx) >= Math.abs(dy) * 2
}

/**
 * Acota el desplazamiento pintado de la fila al recorrido permitido: solo hacia la izquierda.
 *
 * @param {number} dx - Desplazamiento horizontal del gesto
 * @param {number} maxTravel - Recorrido máximo (positivo)
 * @returns {number} Valor en [-maxTravel, 0]
 */
export function clampSwipeOffset(dx, maxTravel) {
  if (!(dx < 0)) return 0
  return Math.max(dx, -maxTravel)
}
