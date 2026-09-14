// Bloquea el scroll del body con CONTADOR (no booleano): varias hojas pueden apilarse (p. ej.
// ExerciseHistoryModal → GymSelector/SetNotesView, o la sesión → RestTimer a pantalla completa).
// Sin contador, cerrar la exterior antes que la interior (React desmonta efectos de padre a
// hijo) deja el body bloqueado para siempre tras cerrar ambas. Ver docs/DECISIONS.md.
//
// position:fixed en vez de overflow:hidden porque en iOS Safari overflow:hidden no bloquea el
// touchmove: el scroll "atraviesa" el overlay y mueve la pantalla de detrás igualmente.
let lockCount = 0
let savedStyle = null
let savedScrollY = 0

export function lockBodyScroll() {
  if (lockCount++ > 0) return
  savedScrollY = window.scrollY
  const { style } = document.body
  savedStyle = {
    position: style.position,
    top: style.top,
    width: style.width,
    overflow: style.overflow,
    paddingRight: style.paddingRight,
  }
  // Compensa el hueco que deja la scrollbar clásica (Windows/Linux) al desaparecer junto con el
  // scroll del body: sin esto el fondo se desplaza unos px mientras el overlay está abierto.
  const scrollbarGap = window.innerWidth - document.documentElement.clientWidth
  style.position = 'fixed'
  style.top = `-${savedScrollY}px`
  style.width = '100%'
  style.overflow = 'hidden'
  if (scrollbarGap > 0) style.paddingRight = `${scrollbarGap}px`
}

export function unlockBodyScroll() {
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount > 0) return
  const { style } = document.body
  style.position = savedStyle.position
  style.top = savedStyle.top
  style.width = savedStyle.width
  style.overflow = savedStyle.overflow
  style.paddingRight = savedStyle.paddingRight
  savedStyle = null
  window.scrollTo(0, savedScrollY)
}
