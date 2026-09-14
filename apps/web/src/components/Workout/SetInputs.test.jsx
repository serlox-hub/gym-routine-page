import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SetField } from '@gym/shared'
import SetValueInput from './SetInputs.jsx'

// Issue #67: el valor sugerido (gris) se lee como placeholder, así que al enfocarlo tiene que
// quedar seleccionado entero y lo tecleado lo sustituye. Un valor ya del usuario sigue con el
// caret al final. Se captura el rAF para reproducir el orden real: focus → caret del toque → rAF.
describe('SetValueInput: selección al enfocar', () => {
  let frame
  beforeEach(() => {
    frame = undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { frame = cb; return 1 })
  })
  afterEach(() => vi.restoreAllMocks())

  const renderField = (props) => {
    render(<SetValueInput onChange={() => {}} placeholder="campo" {...props} />)
    const input = screen.getByPlaceholderText('campo')
    fireEvent.focus(input)
    // type=number no admite setSelectionRange (lanza): ahí no se puede simular el caret del toque.
    if (input.type !== 'number') input.setSelectionRange(1, 1)
    frame()
    return input
  }

  it('peso sugerido (decimal): queda seleccionado entero', () => {
    const input = renderField({ field: SetField.WEIGHT, decimal: true, value: '80', suggested: true })
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2])
  })

  it('duración sugerida: queda seleccionada entera ("1:30")', () => {
    const input = renderField({ field: SetField.TIME, value: 90, suggested: true })
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 4])
  })

  it('reps sugeridas (type=number): se selecciona con select()', () => {
    const select = vi.spyOn(HTMLInputElement.prototype, 'select')
    renderField({ field: SetField.REPS, value: '7', suggested: true })
    expect(select).toHaveBeenCalledTimes(1)
  })

  it('valor del usuario (no sugerido): caret al final, sin seleccionar', () => {
    const select = vi.spyOn(HTMLInputElement.prototype, 'select')
    const input = renderField({ field: SetField.WEIGHT, decimal: true, value: '85', suggested: false })
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 2])
    expect(select).not.toHaveBeenCalled()
  })
})
