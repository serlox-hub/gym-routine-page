import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { X } from 'lucide-react'
import IconButton from './IconButton.jsx'

describe('IconButton', () => {
  it('is a 44px square button named by its label', () => {
    render(<IconButton icon={X} label="Cerrar" onClick={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Cerrar' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('w-11', 'h-11')
  })

  it('calls onClick on a tap', () => {
    const onClick = vi.fn()
    render(<IconButton icon={X} label="Cerrar" onClick={onClick} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('passes the rest of the props to the button, and adds className to its own', () => {
    render(<IconButton icon={X} label="Cerrar" aria-pressed="true" className="-my-2" />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass('-my-2', 'w-11')
  })

  it('paints the 32px circle only when filled', () => {
    const { container, rerender } = render(<IconButton icon={X} label="Cerrar" />)
    const circle = () => container.querySelector('button > span')
    expect(circle().style.backgroundColor).toBe('')

    rerender(<IconButton icon={X} label="Cerrar" filled />)
    expect(circle().style.backgroundColor).not.toBe('')
    expect(circle().style.width).toBe('32px')
  })

  it('disabled: dimmed and not clickable', () => {
    const onClick = vi.fn()
    const { container } = render(<IconButton icon={X} label="Cerrar" onClick={onClick} disabled />)

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toBeDisabled()
    expect(onClick).not.toHaveBeenCalled()
    expect(container.querySelector('button > span').style.opacity).toBe('0.4')
  })

  it('loading: a spinner instead of the icon, and not clickable', () => {
    const onClick = vi.fn()
    const { container } = render(<IconButton icon={X} label="Cerrar" onClick={onClick} loading />)

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toBeDisabled()
    expect(onClick).not.toHaveBeenCalled()
    expect(container.querySelector('.lucide-x')).toBeNull()
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('blocked: dims only the icon, drops the hover, and the tap still goes through', () => {
    const onClick = vi.fn()
    const { container } = render(<IconButton icon={X} label="Cerrar" onClick={onClick} blocked />)
    const button = screen.getByRole('button')

    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button).toBeEnabled()
    expect(button).not.toHaveClass('hover:opacity-80')
    expect(container.querySelector('.lucide-x').style.opacity).toBe('0.4')
  })

  it('a transient state wins over blocked', () => {
    const onClick = vi.fn()
    render(<IconButton icon={X} label="Cerrar" onClick={onClick} blocked disabled />)

    fireEvent.click(screen.getByRole('button'))

    expect(onClick).not.toHaveBeenCalled()
  })
})
