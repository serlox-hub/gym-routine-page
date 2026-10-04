import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Button from './Button.jsx'

describe('Button — touch target', () => {
  // jsdom has no layout, so the class is the only thing to check here: touchTargets.spec.js
  // (e2e) measures the real boxes. `lg` clears 44px by its own padding and text size.
  it.each(['sm', 'md'])('size %s is at least 44px tall, even with a one-line label', (size) => {
    render(<Button size={size}>Guardar</Button>)

    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveClass('min-h-11')
  })
})
