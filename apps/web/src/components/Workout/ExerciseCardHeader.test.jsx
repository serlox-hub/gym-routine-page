import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

import ExerciseCardHeader from './ExerciseCardHeader.jsx'

function renderHeader(props) {
  return render(
    <ExerciseCardHeader
      exerciseName="Press banca"
      collapsed
      onToggleCollapse={vi.fn()}
      {...props}
    />
  )
}

describe('ExerciseCardHeader — asa de arrastre', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin dragHandleProps no pinta asa', () => {
    const { container } = renderHeader()
    expect(container.querySelector('svg.lucide-grip-vertical')).toBeNull()
  })

  it('con dragHandleProps pinta el asa habilitada', () => {
    const { container } = renderHeader({ dragHandleProps: {} })
    const handle = container.querySelector('svg.lucide-grip-vertical').closest('button')
    expect(handle).not.toBeDisabled()
  })

  it('isReordering deshabilita el asa', () => {
    const { container } = renderHeader({ dragHandleProps: {}, isReordering: true })
    const handle = container.querySelector('svg.lucide-grip-vertical').closest('button')
    expect(handle).toBeDisabled()
  })

  it('un click en el asa no pliega/despliega la tarjeta (stopPropagation)', () => {
    const onToggleCollapse = vi.fn()
    const { container } = renderHeader({ dragHandleProps: {}, onToggleCollapse })
    const handle = container.querySelector('svg.lucide-grip-vertical').closest('button')

    fireEvent.click(handle)

    expect(onToggleCollapse).not.toHaveBeenCalled()
  })

  it('un click en el resto de la cabecera sí pliega/despliega', () => {
    const onToggleCollapse = vi.fn()
    renderHeader({ onToggleCollapse })

    fireEvent.click(screen.getByText('Press banca'))

    expect(onToggleCollapse).toHaveBeenCalledTimes(1)
  })
})
