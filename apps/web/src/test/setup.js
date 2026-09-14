import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom no implementa window.scrollTo: sin esto, cada test que monta/desmonta un modal (bloqueo
// de scroll, ver lib/bodyScrollLock.js) imprime "Not implemented: window.scrollTo()" por consola.
window.scrollTo = vi.fn()
