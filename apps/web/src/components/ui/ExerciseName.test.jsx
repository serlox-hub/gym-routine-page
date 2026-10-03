import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import ExerciseName from './ExerciseName.jsx'
import { colors } from '../../lib/styles.js'

// jsdom no conoce `-webkit-box-orient`: lo descarta al leer el estilo, así que aquí no se puede
// comprobar. Sí aparecen `-webkit-line-clamp`, `display` y `overflow`, que es lo que fija el recorte.
function renderName(props) {
  return render(<ExerciseName as="h4" fontSize={14} {...props}>Press banca con mancuernas</ExerciseName>)
}

describe('ExerciseName — etiqueta y recorte', () => {
  it('pinta el nombre dentro de la etiqueta que pide el sitio de uso', () => {
    renderName({ as: 'h3' })
    expect(screen.getByRole('heading', { level: 3, name: 'Press banca con mancuernas' })).toBeInTheDocument()
  })

  it('recorta a dos líneas', () => {
    renderName()
    const name = screen.getByRole('heading', { level: 4 })
    expect(name.style.getPropertyValue('-webkit-line-clamp')).toBe('2')
    expect(name.style.display).toBe('-webkit-box')
    expect(name.style.overflow).toBe('hidden')
  })

  it('usa la altura de línea compartida con el cálculo nativo', () => {
    renderName()
    expect(screen.getByRole('heading', { level: 4 }).style.lineHeight).toBe('1.3')
  })
})

describe('ExerciseName — reserva de altura', () => {
  it('con reserveLines ocupa siempre dos líneas, en em para seguir la fuente y el zoom', () => {
    renderName({ reserveLines: true })
    expect(screen.getByRole('heading', { level: 4 }).style.minHeight).toBe('2.6em')
  })

  it('sin reserveLines no reserva nada (título suelto, p. ej. cabecera de modal)', () => {
    renderName()
    expect(screen.getByRole('heading', { level: 4 }).style.minHeight).toBe('')
  })
})

describe('ExerciseName — estilo', () => {
  it('por defecto va en semibold y color de texto principal', () => {
    renderName()
    const name = screen.getByRole('heading', { level: 4 })
    expect(name.style.fontWeight).toBe('600')
    expect(name).toHaveStyle({ color: colors.textPrimary })
    expect(name.style.fontSize).toBe('14px')
  })

  it('respeta el peso, el color y el tamaño que pasa el sitio de uso', () => {
    renderName({ fontSize: 16, fontWeight: '700', color: colors.textMuted })
    const name = screen.getByRole('heading', { level: 4 })
    expect(name.style.fontSize).toBe('16px')
    expect(name.style.fontWeight).toBe('700')
    expect(name).toHaveStyle({ color: colors.textMuted })
  })

  it('añade el className del sitio sin perder el corte de palabras largas', () => {
    renderName({ className: 'mb-1.5 min-w-0' })
    const name = screen.getByRole('heading', { level: 4 })
    expect(name).toHaveClass('break-words', 'mb-1.5', 'min-w-0')
  })

  it('sin className no deja la palabra "undefined" en la clase', () => {
    renderName()
    expect(screen.getByRole('heading', { level: 4 }).className).not.toContain('undefined')
  })
})
