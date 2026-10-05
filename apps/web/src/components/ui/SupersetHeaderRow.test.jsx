import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

import SupersetHeaderRow from './SupersetHeaderRow.jsx'

function renderRow(props) {
  return render(
    <SupersetHeaderRow
      label="Superset A"
      unitLabels={['Sentadilla', 'Superset A']}
      currentUnitIndex={1}
      onReorderToUnit={vi.fn()}
      {...props}
    />
  )
}

describe('SupersetHeaderRow — contador de ejercicios (sesión)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin count no pinta ningún contador', () => {
    renderRow()
    expect(screen.queryByText(/ejercicio/)).not.toBeInTheDocument()
  })

  it('count 1 usa el singular', () => {
    renderRow({ count: 1 })
    expect(screen.getByText('(1 ejercicio)')).toBeInTheDocument()
  })

  it('count > 1 usa el plural', () => {
    renderRow({ count: 3 })
    expect(screen.getByText('(3 ejercicios)')).toBeInTheDocument()
  })
})

describe('SupersetHeaderRow — menú de reordenar solo con más de una unidad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('con una sola unidad la cabecera no abre el menú al pulsarla', () => {
    renderRow({ unitLabels: ['Superset A'], currentUnitIndex: 0 })

    fireEvent.click(screen.getByText('Superset A'))

    expect(screen.queryByText('Reordenar superset')).not.toBeInTheDocument()
  })

  it('con más de una unidad, pulsar la cabecera abre el menú y permite mover la tirada', () => {
    const onReorderToUnit = vi.fn()
    renderRow({ onReorderToUnit })

    fireEvent.click(screen.getByText('Superset A'))
    fireEvent.click(screen.getByRole('button', { name: 'Reordenar superset' }))
    fireEvent.click(screen.getByRole('button', { name: /1\. Sentadilla/ }))

    expect(onReorderToUnit).toHaveBeenCalledWith(0)
  })
})

describe('SupersetHeaderRow — a real button only when it has something to do', () => {
  it('with more than one unit the header is a button 44 tall', () => {
    renderRow()

    const header = screen.getByRole('button', { name: /Superset A/ })
    expect(header).toHaveAttribute('type', 'button')
    expect(header).toHaveClass('min-h-11')
  })

  it('with a single unit it stays a label, at the same height', () => {
    const { container } = renderRow({ unitLabels: ['Superset A'], currentUnitIndex: 0 })

    expect(screen.queryByRole('button', { name: /Superset A/ })).not.toBeInTheDocument()
    expect(container.querySelector('.min-h-11')).toHaveTextContent('Superset A')
  })
})
