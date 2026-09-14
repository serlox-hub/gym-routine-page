import { describe, it, expect, beforeEach } from 'vitest'
import { lockBodyScroll, unlockBodyScroll } from './bodyScrollLock.js'

function setClientWidth(value) {
  Object.defineProperty(document.documentElement, 'clientWidth', { value, configurable: true })
}

describe('bodyScrollLock', () => {
  beforeEach(() => {
    document.body.style.cssText = ''
    window.scrollY = 0
    window.innerWidth = 1024
    // Sin hueco de scrollbar por defecto: los tests que no comprueban paddingRight no deben
    // verse afectados por él.
    setClientWidth(1024)
    window.scrollTo.mockClear()
  })

  describe('bloqueo y desbloqueo simple', () => {
    it('aplica position fixed, top con el scrollY guardado, width y overflow al bloquear', () => {
      window.scrollY = 150
      lockBodyScroll()

      expect(document.body.style.position).toBe('fixed')
      expect(document.body.style.top).toBe('-150px')
      expect(document.body.style.width).toBe('100%')
      expect(document.body.style.overflow).toBe('hidden')

      unlockBodyScroll()
    })

    it('restaura los valores previos (vacíos) al desbloquear y llama a scrollTo con la Y guardada', () => {
      window.scrollY = 80
      lockBodyScroll()
      unlockBodyScroll()

      expect(document.body.style.position).toBe('')
      expect(document.body.style.top).toBe('')
      expect(document.body.style.width).toBe('')
      expect(document.body.style.overflow).toBe('')
      expect(window.scrollTo).toHaveBeenCalledWith(0, 80)
    })

    it('restaura los valores previos concretos (no vacíos) que tuviera el body', () => {
      document.body.style.position = 'static'
      document.body.style.top = '10px'
      document.body.style.width = '50%'
      document.body.style.overflow = 'visible'

      lockBodyScroll()
      unlockBodyScroll()

      expect(document.body.style.position).toBe('static')
      expect(document.body.style.top).toBe('10px')
      expect(document.body.style.width).toBe('50%')
      expect(document.body.style.overflow).toBe('visible')
    })
  })

  describe('modales apilados (contador, no booleano)', () => {
    it('un segundo lock antes del primer unlock mantiene el body bloqueado tras UN solo unlock', () => {
      lockBodyScroll()
      lockBodyScroll()

      unlockBodyScroll()
      expect(document.body.style.position).toBe('fixed')

      unlockBodyScroll()
      expect(document.body.style.position).toBe('')
    })

    it('con tres locks apilados hacen falta tres unlocks para liberar el body', () => {
      lockBodyScroll()
      lockBodyScroll()
      lockBodyScroll()

      unlockBodyScroll()
      unlockBodyScroll()
      expect(document.body.style.position).toBe('fixed')

      unlockBodyScroll()
      expect(document.body.style.position).toBe('')
    })
  })

  describe('llamadas desbalanceadas', () => {
    it('un unlock sin lock previo no lanza y no corrompe un ciclo posterior legítimo', () => {
      expect(() => unlockBodyScroll()).not.toThrow()
      expect(document.body.style.position).toBe('')

      lockBodyScroll()
      expect(document.body.style.position).toBe('fixed')

      unlockBodyScroll()
      expect(document.body.style.position).toBe('')
    })
  })

  describe('compensación del hueco de la scrollbar (paddingRight)', () => {
    it('fija paddingRight al hueco en px cuando innerWidth > clientWidth', () => {
      window.innerWidth = 1024
      setClientWidth(1000)

      lockBodyScroll()
      expect(document.body.style.paddingRight).toBe('24px')

      unlockBodyScroll()
      expect(document.body.style.paddingRight).toBe('')
    })

    it('deja paddingRight intacto cuando innerWidth === clientWidth (sin scrollbar)', () => {
      window.innerWidth = 1024
      setClientWidth(1024)
      document.body.style.paddingRight = '10px'

      lockBodyScroll()
      expect(document.body.style.paddingRight).toBe('10px')

      unlockBodyScroll()
      expect(document.body.style.paddingRight).toBe('10px')
    })
  })
})
