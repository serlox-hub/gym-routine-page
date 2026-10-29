import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n, SET_SYNC_STATUS } from '@gym/shared'

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

describe('ExerciseCardHeader — nombre a dos líneas y asa alineada con la primera', () => {
  it('la caja del asa mide una línea del nombre, en su mismo tamaño de fuente', () => {
    const { container } = renderHeader({ dragHandleProps: {} })
    const name = screen.getByRole('heading', { level: 4, name: 'Press banca' })
    const handleBox = container.querySelector('svg.lucide-grip-vertical').closest('button').parentElement

    // `em` solo vale como "una línea del nombre" si la caja hereda la fuente del nombre.
    expect(handleBox.style.fontSize).toBe(name.style.fontSize)
    expect(handleBox.style.height).toBe(`${name.style.lineHeight}em`)
  })

  it('el nombre reserva dos líneas para que todas las tarjetas midan lo mismo', () => {
    renderHeader()
    expect(screen.getByRole('heading', { level: 4, name: 'Press banca' }).style.minHeight).toBe('2.6em')
  })
})

describe('ExerciseCardHeader — sync mark of a collapsed card (issue 210)', () => {
  it.each([
    [SET_SYNC_STATUS.SLOW, 'Hay series sin guardar todavía', 'svg.lucide-cloud-off'],
    [SET_SYNC_STATUS.REJECTED, 'Hay series que no se pudieron guardar', 'svg.lucide-circle-alert'],
  ])('collapsed and %s: the icon, named by what happened', (syncStatus, name, icon) => {
    renderHeader({ syncStatus })

    const mark = screen.getByRole('img', { name })
    expect(mark.querySelector(icon)).not.toBeNull()
  })

  it('collapsed with nothing pending: no mark', () => {
    const { container } = renderHeader({ syncStatus: SET_SYNC_STATUS.NONE })

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg.lucide-cloud-off, svg.lucide-circle-alert')).toBeNull()
  })

  it('open: no mark, its rows say it', () => {
    const { container } = renderHeader({ collapsed: false, syncStatus: SET_SYNC_STATUS.REJECTED })

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg.lucide-cloud-off, svg.lucide-circle-alert')).toBeNull()
  })
})
