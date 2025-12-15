import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from './Modal.jsx'

describe('Modal', () => {
  describe('renderizado', () => {
    it('no renderiza nada cuando isOpen es false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Contenido</div>
        </Modal>
      )
      expect(screen.queryByText('Contenido')).not.toBeInTheDocument()
    })

    it('renderiza children cuando isOpen es true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Contenido del modal</div>
        </Modal>
      )
      expect(screen.getByText('Contenido del modal')).toBeInTheDocument()
    })

    it('aplica className personalizado al contenedor', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} className="p-6 custom-class">
          <div>Test</div>
        </Modal>
      )
      const content = screen.getByText('Test').parentElement
      expect(content.className).toContain('p-6')
      expect(content.className).toContain('custom-class')
    })

    it('aplica maxWidth personalizado', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} maxWidth="max-w-lg">
          <div>Test</div>
        </Modal>
      )
      const content = screen.getByText('Test').parentElement
      expect(content.className).toContain('max-w-lg')
    })
  })

  describe('posicionamiento', () => {
    it('usa clases de centro por defecto', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Test</div>
        </Modal>
      )
      const overlay = screen.getByText('Test').parentElement.parentElement
      expect(overlay.className).toContain('items-center')
      expect(overlay.className).toContain('justify-center')
    })

    it('usa clases de bottom sheet cuando position="bottom"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} position="bottom">
          <div>Test</div>
        </Modal>
      )
      const overlay = screen.getByText('Test').parentElement.parentElement
      expect(overlay.className).toContain('items-end')

      const content = screen.getByText('Test').parentElement
      expect(content.className).toContain('rounded-t-2xl')
    })

    it('usa rounded-lg para posicion center', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} position="center">
          <div>Test</div>
        </Modal>
      )
      const content = screen.getByText('Test').parentElement
      expect(content.className).toContain('rounded-lg')
    })
  })

  describe('comportamiento de cierre', () => {
    it('llama onClose al hacer mouseDown en el overlay', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Contenido</div>
        </Modal>
      )

      const overlay = screen.getByText('Contenido').parentElement.parentElement
      fireEvent.mouseDown(overlay)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('NO llama onClose al hacer mouseDown en el contenido', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Contenido</div>
        </Modal>
      )

      const content = screen.getByText('Contenido').parentElement
      fireEvent.mouseDown(content)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('NO llama onClose al hacer mouseDown en elementos internos', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <button>Boton interno</button>
        </Modal>
      )

      fireEvent.mouseDown(screen.getByText('Boton interno'))

      expect(onClose).not.toHaveBeenCalled()
    })

    it('NO llama onClose al hacer click (solo mouseDown cierra)', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Contenido</div>
        </Modal>
      )

      const overlay = screen.getByText('Contenido').parentElement.parentElement
      fireEvent.click(overlay)

      // onClick no debe cerrar, solo onMouseDown
      expect(onClose).not.toHaveBeenCalled()
    })

    it('permite onClose undefined (modal no cerrable por overlay)', () => {
      render(
        <Modal isOpen={true} onClose={undefined}>
          <div>Contenido</div>
        </Modal>
      )

      const overlay = screen.getByText('Contenido').parentElement.parentElement

      // No debe lanzar error
      expect(() => fireEvent.mouseDown(overlay)).not.toThrow()
    })
  })

  describe('estilos de borde', () => {
    it('aplica borde por defecto', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Test</div>
        </Modal>
      )
      const content = screen.getByText('Test').parentElement
      expect(content.style.border).toContain('1px solid')
    })

    it('no aplica borde cuando noBorder es true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} noBorder>
          <div>Test</div>
        </Modal>
      )
      const content = screen.getByText('Test').parentElement
      expect(content.style.border).toBe('')
    })
  })
})
