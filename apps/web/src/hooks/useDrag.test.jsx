import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useDraggable } from './useDrag.js'

// The pills that use the hook start at top 8 (RestTimer) and 12 (ActiveSessionBanner). Any higher
// and iOS Safari stops painting the status bar strip (#164), so a drag never goes above the start.
function Pill() {
  const { dragProps, dragStyle } = useDraggable()
  return <div data-testid="pill" style={dragStyle} {...dragProps} />
}

function drag(el, { from = { x: 0, y: 0 }, dx = 0, dy = 0 }) {
  fireEvent.mouseDown(el, { clientX: from.x, clientY: from.y })
  fireEvent.mouseMove(window, { clientX: from.x + dx, clientY: from.y + dy })
  fireEvent.mouseUp(window)
}

const translate = (x, y) => `translate(calc(-50% + ${x}px), ${y}px)`

describe('useDraggable', () => {
  it('starts at the origin', () => {
    const { getByTestId } = render(<Pill />)
    expect(getByTestId('pill').style.transform).toBe(translate(0, 0))
  })

  it('dragging up from the start keeps y at 0', () => {
    const { getByTestId } = render(<Pill />)
    const pill = getByTestId('pill')

    drag(pill, { from: { x: 100, y: 100 }, dy: -60 })

    expect(pill.style.transform).toBe(translate(0, 0))
  })

  it('dragging down still moves', () => {
    const { getByTestId } = render(<Pill />)
    const pill = getByTestId('pill')

    drag(pill, { from: { x: 100, y: 100 }, dy: 40 })

    expect(pill.style.transform).toBe(translate(0, 40))
  })

  it('a later drag up stops at the start, not at the offset where it began', () => {
    const { getByTestId } = render(<Pill />)
    const pill = getByTestId('pill')

    drag(pill, { from: { x: 100, y: 100 }, dy: 40 })
    drag(pill, { from: { x: 100, y: 140 }, dy: -100 })

    expect(pill.style.transform).toBe(translate(0, 0))
  })

  it('sideways moves freely in both directions', () => {
    const { getByTestId } = render(<Pill />)
    const pill = getByTestId('pill')

    drag(pill, { from: { x: 100, y: 100 }, dx: -30, dy: -20 })
    expect(pill.style.transform).toBe(translate(-30, 0))

    drag(pill, { from: { x: 70, y: 100 }, dx: 80 })
    expect(pill.style.transform).toBe(translate(50, 0))
  })

  it('a touch drag up is clamped the same way', () => {
    const { getByTestId } = render(<Pill />)
    const pill = getByTestId('pill')

    fireEvent.touchStart(pill, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchMove(window, { touches: [{ clientX: 110, clientY: 50 }] })
    fireEvent.touchEnd(window)

    expect(pill.style.transform).toBe(translate(10, 0))
  })
})
