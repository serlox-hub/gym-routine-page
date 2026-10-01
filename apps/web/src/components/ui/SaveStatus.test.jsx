import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n, SLOW_PENDING_MS } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver Modal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, act } from '@testing-library/react'
import SaveStatus from './SaveStatus.jsx'

const SLOW_TEXT = 'Conexión lenta, sigo intentándolo...'

describe('SaveStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing while pending for less than the threshold', () => {
    render(<SaveStatus isPending error={null} />)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS - 1) })

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('renders the slow-connection text once pending reaches the threshold', () => {
    render(<SaveStatus isPending error={null} />)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS) })

    expect(screen.getByText(SLOW_TEXT)).toBeInTheDocument()
  })

  it('renders the error when not pending and an error is set', () => {
    render(<SaveStatus isPending={false} error="No se pudo." />)

    expect(screen.getByText('No se pudo.')).toBeInTheDocument()
  })

  it('a retry in flight hides the earlier error', () => {
    render(<SaveStatus isPending error="No se pudo." />)

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('puts the slow-connection text and the error inside the live region', () => {
    const { rerender } = render(<SaveStatus isPending error={null} />)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS) })

    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toContainElement(screen.getByText(SLOW_TEXT))

    rerender(<SaveStatus isPending={false} error="No se pudo." />)

    expect(screen.getByRole('status')).toBe(region)
    expect(region).toContainElement(screen.getByText('No se pudo.'))
    expect(screen.queryByText(SLOW_TEXT)).not.toBeInTheDocument()
  })

  it('keeps the same live region from the first render, so its text gets announced', () => {
    const { rerender } = render(<SaveStatus isPending={false} error={null} />)
    const region = screen.getByRole('status')

    rerender(<SaveStatus isPending={false} error="No se pudo." />)

    expect(screen.getByRole('status')).toBe(region)
  })

  it('applies className only while there is something to say', () => {
    const { rerender } = render(<SaveStatus isPending={false} error={null} className="mt-3" />)
    expect(screen.getByRole('status')).not.toHaveClass('mt-3')

    rerender(<SaveStatus isPending error={null} className="mt-3" />)
    expect(screen.getByRole('status')).not.toHaveClass('mt-3')

    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS) })
    expect(screen.getByRole('status')).toHaveClass('mt-3')

    rerender(<SaveStatus isPending={false} error="No se pudo." className="mt-3" />)
    expect(screen.getByRole('status')).toHaveClass('mt-3')

    rerender(<SaveStatus isPending={false} error={null} className="mt-3" />)
    expect(screen.getByRole('status')).not.toHaveClass('mt-3')
  })

  it('renders nothing when neither pending nor failed', () => {
    render(<SaveStatus isPending={false} error={null} />)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS) })

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
