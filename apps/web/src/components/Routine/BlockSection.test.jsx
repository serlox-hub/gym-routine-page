import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

// Mockea solo el hook con estado de red (dispara useQuery vía @gym/shared); las reglas de orden
// (`buildExerciseRows`, `moveSuperset`, ...) se dejan reales, que es lo que prueba este archivo.
vi.mock('@gym/shared', async () => {
  const actual = await vi.importActual('@gym/shared')
  return {
    ...actual,
    useResolvedDistanceUnit: () => 'm',
  }
})

import BlockSection from './BlockSection.jsx'

const exercise = (id, name) => ({ id, name_es: name, tracked_fields: ['weight', 'reps'] })

const row = (id, sortOrder, supersetGroup, name) => ({
  id,
  sort_order: sortOrder,
  superset_group: supersetGroup,
  series: 3,
  reps: '8-12',
  level: null,
  rir: null,
  rest_seconds: 90,
  exercise: exercise(id * 10, name),
})

function renderBlock(exercises, props = {}) {
  return render(
    <BlockSection
      block={{ name: 'Principal', is_warmup: false, routine_exercises: exercises }}
      routineDayId={1}
      {...props}
    />
  )
}

describe('BlockSection — filas planas y tarjeta morada por fila', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pinta una cabecera de superserie por tirada consecutiva', () => {
    renderBlock([row(1, 1, null, 'Sentadilla'), row(2, 2, 1, 'Press'), row(3, 3, 1, 'Remo')])

    expect(screen.getAllByText('Superset A')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent))
      .toEqual(['Sentadilla', 'Press', 'Remo'])
  })

  it('un grupo partido en dos tiradas pinta dos cabeceras (issue #88, criterio 8)', () => {
    renderBlock([row(2, 1, 1, 'Press'), row(1, 2, null, 'Sentadilla'), row(3, 3, 1, 'Remo')])

    expect(screen.getAllByText('Superset A')).toHaveLength(2)
  })

  it('solo el último miembro de la tirada cierra la tarjeta por abajo', () => {
    const { container } = renderBlock([row(1, 1, null, 'Sentadilla'), row(2, 2, 1, 'Press'), row(3, 3, 1, 'Remo')])

    // Las filas de miembro pintan SOLO los laterales; la cabecera pinta el borde entero.
    const borderedRows = [...container.querySelectorAll('div')]
      .filter(div => div.style.borderLeftStyle === 'solid' && div.style.borderTopStyle !== 'solid')
    expect(borderedRows).toHaveLength(2)
    expect(borderedRows[0].style.borderBottomWidth).toBe('')
    expect(borderedRows[1].style.borderBottomWidth).toBe('1px')
  })

  it('con una sola unidad no hay asas: no hay nada que reordenar', () => {
    const { container } = renderBlock([row(1, 1, null, 'Sentadilla')])
    expect(container.querySelector('svg.lucide-grip-vertical')).toBeNull()
  })

  it('el miembro de una tirada de uno no lleva asa, pero su cabecera sí', () => {
    const { container } = renderBlock([row(1, 1, null, 'Sentadilla'), row(2, 2, 1, 'Press')])
    // Dos unidades: el individual y la tirada. Asas: el individual y la cabecera, no el miembro.
    expect(container.querySelectorAll('svg.lucide-grip-vertical')).toHaveLength(2)
  })

  it('"Reordenar superset" mueve la tirada completa por posición de unidad', () => {
    const onReorderBlock = vi.fn()
    renderBlock(
      [row(1, 1, null, 'Sentadilla'), row(2, 2, 1, 'Press'), row(3, 3, 1, 'Remo')],
      { onReorderBlock }
    )

    fireEvent.click(screen.getByText('Superset A'))
    fireEvent.click(screen.getByRole('button', { name: 'Reordenar superset' }))
    // Posiciones de UNIDAD: 1. Sentadilla, 2. Superset A (la actual).
    fireEvent.click(screen.getByRole('button', { name: /1\. Sentadilla/ }))

    expect(onReorderBlock).toHaveBeenCalledWith([2, 3, 1])
  })

  it('el menú «···» de un individual ofrece posiciones de UNIDAD: la superserie es una sola entrada', () => {
    const onReorderBlock = vi.fn()
    renderBlock(
      [row(1, 1, null, 'Sentadilla'), row(2, 2, 1, 'Press'), row(3, 3, 1, 'Remo')],
      { onReorderBlock }
    )

    const card = screen.getByText('Sentadilla').closest('[class*="cursor-pointer"]')
    fireEvent.click(card)
    fireEvent.click(screen.getByRole('button', { name: 'Reordenar' }))

    // Solo dos posiciones ofrecidas: el individual y la superserie entera, no una por miembro.
    const positionButtons = screen.getAllByRole('button', { name: /^\d+\./ })
    expect(positionButtons.map(b => b.textContent)).toEqual([
      expect.stringContaining('1. Sentadilla'),
      expect.stringContaining('2. Superset A'),
    ])

    fireEvent.click(screen.getByRole('button', { name: /2\. Superset A/ }))

    // El individual pasa detrás de la superserie SIN partirla: Press y Remo siguen consecutivos.
    expect(onReorderBlock).toHaveBeenCalledWith([2, 3, 1])
  })

  it('el menú «···» de un miembro de superserie solo ofrece las posiciones de SU tirada', () => {
    const onReorderBlock = vi.fn()
    renderBlock(
      [
        row(1, 1, null, 'Sentadilla'),
        row(2, 2, 1, 'Press'),
        row(3, 3, 1, 'Remo'),
        row(4, 4, 1, 'Curl'),
      ],
      { onReorderBlock }
    )

    const card = screen.getByText('Remo').closest('[class*="cursor-pointer"]')
    fireEvent.click(card)
    fireEvent.click(screen.getByRole('button', { name: 'Reordenar' }))

    // Tres posiciones (los tres miembros de la tirada), nunca el individual "Sentadilla".
    const positionButtons = screen.getAllByRole('button', { name: /^\d+\./ })
    expect(positionButtons.map(b => b.textContent)).toEqual([
      expect.stringContaining('1. Press'),
      expect.stringContaining('2. Remo'),
      expect.stringContaining('3. Curl'),
    ])

    fireEvent.click(screen.getByRole('button', { name: /1\. Press/ }))

    // Remo pasa delante de Press dentro de la tirada; Sentadilla y el orden del bloque no se tocan.
    expect(onReorderBlock).toHaveBeenCalledWith([1, 3, 2, 4])
  })
})
