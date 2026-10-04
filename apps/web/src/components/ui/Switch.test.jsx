import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Switch from './Switch.jsx'

describe('Switch', () => {
  it('exposes its state as a switch with its accessible name', () => {
    render(<Switch checked onChange={vi.fn()} accessibilityLabel="Solo mis ejercicios" />)

    expect(screen.getByRole('switch', { name: 'Solo mis ejercicios' })).toHaveAttribute('aria-checked', 'true')
  })

  it('asks for the opposite value on a tap', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Switch checked={false} onChange={onChange} />)

    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith(true)

    rerender(<Switch checked onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('ignores taps while disabled', () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} disabled />)

    fireEvent.click(screen.getByRole('switch'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('is a real disabled button while disabled, so it also leaves the tab order', () => {
    const { rerender } = render(<Switch checked={false} onChange={vi.fn()} disabled />)
    expect(screen.getByRole('switch')).toBeDisabled()

    rerender(<Switch checked={false} onChange={vi.fn()} />)
    expect(screen.getByRole('switch')).toBeEnabled()
  })

  it('is a 44px tall button around the smaller track', () => {
    render(<Switch checked={false} onChange={vi.fn()} />)

    expect(screen.getByRole('switch')).toHaveClass('h-11')
  })
})
