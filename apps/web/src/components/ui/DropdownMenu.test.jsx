import { describe, it, expect, vi } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'
import DropdownMenu from './DropdownMenu.jsx'

const TRIGGER_NAME = 'Más opciones'

describe('DropdownMenu — trigger', () => {
  it('is a named 44px button whatever the icon size', () => {
    render(<DropdownMenu items={[{ label: 'Editar', onClick: vi.fn() }]} triggerSize={14} />)

    const trigger = screen.getByRole('button', { name: TRIGGER_NAME })
    expect(trigger).toHaveClass('w-11', 'h-11')
  })

  it('opens the menu without letting the tap reach the row it sits in', () => {
    // Rows fold and unfold on click (DayCard, SessionInlineDetail): the «···» must not do it too.
    const onRowClick = vi.fn()
    render(
      <div onClick={onRowClick}>
        <DropdownMenu items={[{ label: 'Editar', onClick: vi.fn() }]} />
      </div>
    )
    expect(screen.queryByText('Editar')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }))

    expect(screen.getByText('Editar')).toBeInTheDocument()
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('passes triggerClassName to the trigger', () => {
    render(<DropdownMenu items={[{ label: 'Editar' }]} triggerClassName="shrink-0 custom-layout" />)

    expect(screen.getByRole('button', { name: TRIGGER_NAME })).toHaveClass('shrink-0', 'custom-layout')
  })
})

describe('DropdownMenu — items', () => {
  it('runs the item action and closes the menu', () => {
    const onEdit = vi.fn()
    render(<DropdownMenu items={[{ label: 'Editar', onClick: onEdit }]} />)
    fireEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }))

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Editar')).not.toBeInTheDocument()
  })

  it('a submenu child runs its action, is 44 tall and closes the whole menu', () => {
    const onPick = vi.fn()
    render(
      <DropdownMenu
        items={[{ label: 'Mover a', children: [{ label: 'Día 2', onClick: onPick }] }]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }))
    fireEvent.click(screen.getByRole('button', { name: 'Mover a' }))

    const child = screen.getByRole('button', { name: 'Día 2' })
    expect(child).toHaveClass('min-h-11')
    fireEvent.click(child)

    expect(onPick).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Mover a')).not.toBeInTheDocument()
  })

  it('ignores falsy entries (conditional items)', () => {
    render(<DropdownMenu items={[false, null, { label: 'Editar' }]} />)
    fireEvent.click(screen.getByRole('button', { name: TRIGGER_NAME }))

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })
})
