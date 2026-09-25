import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useSwipeToDelete } from './useSwipeToDelete.js'

// Zona que escucha y fila que se mueve SEPARADAS, como en DayCard (se escucha la cabecera, se
// desliza la tarjeta entera). El caso de zona == fila ya lo cubre ExerciseCard.test.jsx.
function SplitRow({ onDelete, onClick }) {
  const swipe = useSwipeToDelete({ onDelete })
  return (
    <div ref={swipe.rowRef} data-testid="row">
      <div data-testid="zone" {...swipe.handlers} onClick={() => { if (!swipe.consumeClick()) onClick() }} />
      <div data-testid="body" />
    </div>
  )
}

function swipe(el, { dx, dy = 0 }) {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
  fireEvent.pointerMove(el, { pointerId: 1, clientX: dx, clientY: dy, pointerType: 'touch' })
  fireEvent.pointerUp(el, { pointerId: 1, clientX: dx, clientY: dy, pointerType: 'touch' })
}

describe('useSwipeToDelete — zona y fila separadas', () => {
  it('un swipe sobre la zona que cruza el umbral borra y se come el click posterior', () => {
    const onDelete = vi.fn()
    const onClick = vi.fn()
    const { getByTestId } = render(<SplitRow onDelete={onDelete} onClick={onClick} />)

    swipe(getByTestId('zone'), { dx: -100 })
    fireEvent.click(getByTestId('zone'))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('mueve la fila, no la zona, y en reposo no le deja ningún transform', () => {
    const { getByTestId } = render(<SplitRow onDelete={vi.fn()} onClick={vi.fn()} />)
    const zone = getByTestId('zone')
    const row = getByTestId('row')

    fireEvent.pointerDown(zone, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    fireEvent.pointerMove(zone, { pointerId: 1, clientX: -40, clientY: 0, pointerType: 'touch' })
    expect(row.style.transform).toBe('translateX(-40px)')
    expect(zone.style.transform).toBe('')

    // Un transform residual haría de contenedor de los `position: fixed` de dentro (el menú del día).
    fireEvent.pointerUp(zone, { pointerId: 1, clientX: -40, clientY: 0, pointerType: 'touch' })
    expect(row.style.transform).toBe('')
  })

  it('un toque sin movimiento deja pasar el click', () => {
    const onDelete = vi.fn()
    const onClick = vi.fn()
    const { getByTestId } = render(<SplitRow onDelete={onDelete} onClick={onClick} />)
    const zone = getByTestId('zone')

    fireEvent.pointerDown(zone, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    fireEvent.pointerUp(zone, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    fireEvent.click(zone)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('un movimiento vertical cede el gesto (scroll) y no mueve la fila', () => {
    const onDelete = vi.fn()
    const { getByTestId } = render(<SplitRow onDelete={onDelete} onClick={vi.fn()} />)

    swipe(getByTestId('zone'), { dx: -100, dy: 200 })

    expect(onDelete).not.toHaveBeenCalled()
    expect(getByTestId('row').style.transform).toBe('')
  })
})
