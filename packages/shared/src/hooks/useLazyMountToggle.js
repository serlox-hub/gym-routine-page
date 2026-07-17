import { useState, useEffect, useCallback } from 'react'

/**
 * Toggle para una sección que se monta perezosamente y, una vez abierta, NO se
 * desmonta al cerrarse (el consumidor la oculta con `display:none`). Evita re-montar
 * su contenido —p. ej. un GIF que se re-pediría a la red— al alternarla.
 *
 * Olvida haber sido abierta cuando el contenedor se colapsa (`collapsed`): como
 * colapsar ya desmonta el subárbol, al reexpandir con la sección cerrada no se
 * re-monta oculta ni se re-pide nada.
 *
 * @param {boolean} collapsed - true cuando el contenedor de la sección está colapsado
 * @returns {{ open: boolean, mounted: boolean, toggle: () => void }}
 *   `open` = visible · `mounted` = debe renderizarse (visible u oculta) · `toggle` = alterna
 */
export function useLazyMountToggle(collapsed) {
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)

  // Colapsar desmonta el subárbol; olvidar la apertura evita re-montar (y re-pedir)
  // el contenido oculto al reexpandir con la sección cerrada.
  useEffect(() => {
    if (collapsed) setEverOpened(false)
  }, [collapsed])

  // setEverOpened(true) en CADA toggle (también al cerrar) es load-bearing: mantiene
  // `mounted` en true tras cerrar para no desmontar el contenido montado.
  const toggle = useCallback(() => {
    setOpen((v) => !v)
    setEverOpened(true)
  }, [])

  return { open, mounted: open || everOpened, toggle }
}
