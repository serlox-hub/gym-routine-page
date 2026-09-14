import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CaretEndInput from './CaretEndInput.jsx'

// El componente corrige el caret en un rAF, DESPUÉS de que el navegador lo coloque donde cae el
// toque. Se captura el frame para reproducir ese orden: focus → caret del toque → rAF.
describe('CaretEndInput', () => {
  let frame
  beforeEach(() => {
    frame = undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { frame = cb; return 1 })
  })
  afterEach(() => vi.restoreAllMocks())

  const focusTappingAt = (input, position) => {
    fireEvent.focus(input)
    input.setSelectionRange(position, position)
    frame()
  }

  it('por defecto lleva el caret al final, no donde cae el toque', () => {
    render(<CaretEndInput type="text" defaultValue="80" placeholder="peso" />)
    const input = screen.getByPlaceholderText('peso')
    focusTappingAt(input, 0)
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 2])
  })

  it('con selectTextOnFocus selecciona el valor entero: lo tecleado lo sustituye (issue #67)', () => {
    render(<CaretEndInput type="text" defaultValue="80" selectTextOnFocus placeholder="peso" />)
    const input = screen.getByPlaceholderText('peso')
    focusTappingAt(input, 1)
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2])
  })

  it('en type=number selecciona con select(): setSelectionRange lanza en ese tipo', () => {
    const select = vi.spyOn(HTMLInputElement.prototype, 'select')
    render(<CaretEndInput type="number" defaultValue="7" selectTextOnFocus placeholder="reps" />)
    fireEvent.focus(screen.getByPlaceholderText('reps'))
    frame()
    expect(select).toHaveBeenCalledTimes(1)
  })

  it('no reenvía selectTextOnFocus al DOM', () => {
    render(<CaretEndInput type="text" defaultValue="80" selectTextOnFocus placeholder="peso" />)
    expect(screen.getByPlaceholderText('peso')).not.toHaveAttribute('selecttextonfocus')
  })

  it('sigue llamando al onFocus del consumidor', () => {
    const onFocus = vi.fn()
    render(<CaretEndInput type="text" defaultValue="80" selectTextOnFocus onFocus={onFocus} placeholder="peso" />)
    fireEvent.focus(screen.getByPlaceholderText('peso'))
    expect(onFocus).toHaveBeenCalledTimes(1)
  })
})
