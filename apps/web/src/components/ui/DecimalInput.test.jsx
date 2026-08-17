import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DecimalInput from './DecimalInput.jsx'

// El caso que motiva el componente: con `type="number"` el navegador decide el separador decimal
// según SU locale, así que en uno de punto "82,5" se convierte en 825 sin avisar (medido: es-ES
// ✅ / en-GB ❌). Ver issue #26.
describe('DecimalInput', () => {
  // Controlado, como en los formularios reales: así se comprueba el valor que queda en pantalla
  // (y por tanto el que se guarda), no solo el evento.
  function Harness() {
    const [value, setValue] = useState('')
    return <DecimalInput value={value} onChange={(e) => setValue(e.target.value)} placeholder="peso" />
  }

  const renderInput = () => {
    render(<Harness />)
    return screen.getByPlaceholderText('peso')
  }

  it('NO es type=number (ahí el navegador se come la coma según su locale)', () => {
    const input = renderInput()
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('inputmode', 'decimal')
  })

  it('normaliza la coma a punto: "82,5" son 82.5, no 825', () => {
    const input = renderInput()
    fireEvent.change(input, { target: { value: '82,5' } })
    expect(input).toHaveValue('82.5')
  })

  it('el punto pasa tal cual', () => {
    const input = renderInput()
    fireEvent.change(input, { target: { value: '82.5' } })
    expect(input).toHaveValue('82.5')
  })

  it('vaciar el campo sigue vaciándolo', () => {
    const input = renderInput()
    fireEvent.change(input, { target: { value: '80,5' } })
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('')
  })
})
